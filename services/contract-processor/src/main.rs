use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use hmac::{Hmac, Mac};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::PgPool;
use std::sync::Arc;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Deserialize)]
struct GitHubWebhook {
    repository: Repository,
    pusher: Pusher,
    commits: Vec<Commit>,
}

#[derive(Debug, Deserialize)]
struct Repository {
    name: String,
    full_name: String,
}

#[derive(Debug, Deserialize)]
struct Pusher {
    name: String,
    email: String,
}

#[derive(Debug, Deserialize)]
struct Commit {
    id: String,
    message: String,
    added: Vec<String>,
    modified: Vec<String>,
}

#[derive(Debug, Serialize)]
struct ContractJob {
    job_id: String,
    repository: String,
    commit_id: String,
    contract_files: Vec<String>,
    timestamp: i64,
}

struct AppState {
    db_pool: PgPool,
    redis_client: redis::Client,
    github_secret: String,
}

/// Verify GitHub webhook signature
fn verify_signature(payload: &[u8], signature: &str, secret: &str) -> bool {
    if !signature.starts_with("sha256=") {
        return false;
    }

    let signature = &signature[7..];
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("Valid key");
    mac.update(payload);
    
    let result = mac.finalize();
    let expected = hex::encode(result.into_bytes());
    
    signature == expected
}

/// GitHub webhook handler
async fn github_webhook(
    req: HttpRequest,
    body: web::Bytes,
    data: web::Data<Arc<AppState>>,
) -> HttpResponse {
    // Verify signature
    let signature = match req.headers().get("x-hub-signature-256") {
        Some(sig) => sig.to_str().unwrap_or(""),
        None => return HttpResponse::Unauthorized().body("Missing signature"),
    };

    if !verify_signature(&body, signature, &data.github_secret) {
        return HttpResponse::Unauthorized().body("Invalid signature");
    }

    // Parse webhook payload
    let webhook: GitHubWebhook = match serde_json::from_slice(&body) {
        Ok(w) => w,
        Err(e) => {
            log::error!("Failed to parse webhook: {}", e);
            return HttpResponse::BadRequest().body("Invalid payload");
        }
    };

    // Find smart contract files (.rs, .sol, .move, etc.)
    let mut contract_files = Vec::new();
    for commit in &webhook.commits {
        for file in &commit.added {
            if is_contract_file(file) {
                contract_files.push(file.clone());
            }
        }
        for file in &commit.modified {
            if is_contract_file(file) {
                contract_files.push(file.clone());
            }
        }
    }

    if contract_files.is_empty() {
        return HttpResponse::Ok().body("No contract files");
    }

    // Create processing job
    let job = ContractJob {
        job_id: uuid::Uuid::new_v4().to_string(),
        repository: webhook.repository.full_name.clone(),
        commit_id: webhook.commits[0].id.clone(),
        contract_files,
        timestamp: chrono::Utc::now().timestamp(),
    };

    // Queue job in Redis
    let mut redis_conn = match data.redis_client.get_multiplexed_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("Redis connection error: {}", e);
            return HttpResponse::InternalServerError().body("Queue error");
        }
    };

    let job_json = serde_json::to_string(&job).unwrap();
    let _: () = redis_conn
        .lpush("contract_jobs", job_json)
        .await
        .unwrap_or_default();

    log::info!("Queued contract processing job: {}", job.job_id);

    HttpResponse::Ok().json(serde_json::json!({
        "status": "queued",
        "job_id": job.job_id
    }))
}

/// Check if file is a smart contract
fn is_contract_file(filename: &str) -> bool {
    filename.ends_with(".rs") // Rust
        || filename.ends_with(".sol") // Solidity
        || filename.ends_with(".move") // Move
        || filename.ends_with(".vy") // Vyper
        || filename.contains("contracts/")
}

/// Process contract jobs from queue
async fn process_contract_jobs(state: Arc<AppState>) {
    let mut redis_conn = state
        .redis_client
        .get_multiplexed_async_connection()
        .await
        .expect("Redis connection");

    loop {
        let result: Result<Option<String>, _> = redis_conn.brpop("contract_jobs", 0.0).await;

        if let Ok(Some(job_json)) = result {
            let job: ContractJob = match serde_json::from_str(&job_json) {
                Ok(j) => j,
                Err(e) => {
                    log::error!("Failed to parse job: {}", e);
                    continue;
                }
            };

            log::info!("Processing contract job: {}", job.job_id);

            // TODO: Add actual contract validation/compilation logic here
            // This would include:
            // 1. Fetch contract code from GitHub
            // 2. Validate syntax
            // 3. Compile (if applicable)
            // 4. Run security checks
            // 5. Store in database

            // Simulate processing
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

            // Store in database
            let _ = sqlx::query!(
                "INSERT INTO contract_deployments (job_id, repository, commit_id, status, created_at)
                 VALUES ($1, $2, $3, $4, NOW())",
                job.job_id,
                job.repository,
                job.commit_id,
                "processed"
            )
            .execute(&state.db_pool)
            .await;

            log::info!("Completed contract job: {}", job.job_id);
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    dotenv::dotenv().ok();

    let database_url = std::env::var("POSTGRES_URL").expect("POSTGRES_URL must be set");
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");
    let github_secret = std::env::var("GITHUB_WEBHOOK_SECRET").unwrap_or_default();

    // Database connection pool
    let db_pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Redis client
    let redis_client = redis::Client::open(redis_url).expect("Invalid Redis URL");

    let state = Arc::new(AppState {
        db_pool,
        redis_client,
        github_secret,
    });

    // Start background job processor
    let processor_state = state.clone();
    tokio::spawn(async move {
        process_contract_jobs(processor_state).await;
    });

    log::info!("Starting contract processor on 0.0.0.0:8080");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(state.clone()))
            .route("/webhook", web::post().to(github_webhook))
            .route("/health", web::get().to(|| async { HttpResponse::Ok().body("OK") }))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
