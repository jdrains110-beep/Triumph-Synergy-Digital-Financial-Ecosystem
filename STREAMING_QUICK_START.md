# 🎬 Triumph Synergy Streaming - Quick Start Guide

**Get started with streaming in 5 minutes**  
**Date:** January 7, 2026

---

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies ✅
```bash
pnpm install agora-rtc-sdk-ng hls.js video.js shaka-player socket.io-client zustand
```

### Step 2: Set Environment Variables
```bash
# .env.local
NEXT_PUBLIC_AGORA_APP_ID=your_app_id
NEXT_PUBLIC_AGORA_TOKEN=your_token
NEXT_PUBLIC_CDN_PRIMARY=https://cdn.triumph-synergy.com
AWS_REGION=us-east-1
RECORDING_BUCKET=triumph-streams
```

### Step 3: Use the Streaming Hook

```typescript
import { useStreaming } from "@/lib/streaming-sdk/use-streaming";

export function MyStream() {
  const {
    initializeSession,
    startStream,
    endStream,
    status,
    viewerCount,
  } = useStreaming("user_123");

  return (
    <div>
      <button onClick={() => initializeSession("My Stream", "Description")}>
        Initialize
      </button>
      <button onClick={startStream} disabled={status !== "initialized"}>
        Start
      </button>
      <button onClick={endStream} disabled={status !== "live"}>
        End
      </button>
      <p>Viewers: {viewerCount}</p>
    </div>
  );
}
```

### Step 4: Add Video Player

```typescript
import { VideoPlayer } from "@/components/streaming/video-player";

<VideoPlayer
  streamUrl="https://stream.example.com/live.m3u8"
  isLive={true}
  quality="1080p"
/>
```

### Step 5: Add Interactive Features

```typescript
import {
  InteractiveChat,
  LivePolls,
  WatchParty,
  AIRecommendations,
} from "@/components/streaming";

// Add to your component
<InteractiveChat onSendMessage={sendMessage} />
<LivePolls onCreatePoll={createPoll} />
<WatchParty sessionId={sessionId} />
<AIRecommendations onSelect={selectStream} />
```

---

## 📚 Complete Example

```typescript
"use client";

import { useStreaming } from "@/lib/streaming-sdk/use-streaming";
import { StreamingDashboard } from "@/components/streaming/streaming-dashboard";
import { VideoPlayer } from "@/components/streaming/video-player";

export default function StreamingPage() {
  const userId = "user_123";

  return (
    <StreamingDashboard
      userId={userId}
      streamUrl="https://stream.example.com/live.m3u8"
    />
  );
}
```

---

## 🎯 Common Tasks

### Initialize a Stream

```typescript
const session = await initializeSession(
  "Gaming Session",
  "Join me for gaming!",
  {
    category: "gaming",
    tags: ["live", "gaming"],
    isPublic: true,
  }
);
```

### Start Broadcasting

```typescript
await startStream();
// Returns: { success: true, streamKey: "rtmps://..." }
```

### Send Chat Message

```typescript
sendMessage("Hello everyone! 👋");
```

### Create a Poll

```typescript
createPoll(
  "What game should we play?",
  ["Minecraft", "Fortnite", "Valorant", "Elden Ring"]
);
```

### Update Stream Quality

```typescript
await updateQuality("720p");
```

### Get Bandwidth Recommendation

```typescript
const recommendation = await fetch("/api/streaming/bandwidth/recommend", {
  method: "POST",
  body: JSON.stringify({ bandwidth: 2500 }),
});
```

### Create Watch Party

```typescript
const party = await fetch("/api/streaming/watch-party/create", {
  method: "POST",
  body: JSON.stringify({
    sessionId: "stream_123",
    hostId: "user_456",
  }),
});
```

### Get AI Recommendations

```typescript
const { recommendations } = await fetch(
  `/api/streaming/recommendations/${userId}`
).then((r) => r.json());
```

### Get Stream Analytics

```typescript
const analytics = await fetch(
  `/api/streaming/analytics/${sessionId}`
).then((r) => r.json());

console.log(analytics);
// {
//   totalViewers: 1234,
//   peakViewers: 2890,
//   engagementRate: 42.5,
//   completionRate: 78.3,
//   revenue: 450.0
// }
```

---

## 🎨 Customization

### Change Configuration

```typescript
// lib/streaming-sdk/streaming-config.ts
export const STREAMING_CONFIG = {
  agora: {
    video: {
      bitrate: 5000, // Increase for better quality
      frameRate: 60, // More smooth
    },
  },
  interactivity: {
    chat: {
      maxMessageLength: 1000, // Allow longer messages
      rateLimitPerMinute: 20,
    },
    polls: {
      maxOptions: 10, // More poll options
    },
  },
};
```

### Custom Styling

```typescript
// Use Tailwind classes
<StreamingDashboard
  className="dark:bg-slate-900 dark:text-white"
  videoPlayerClass="rounded-2xl shadow-2xl"
/>
```

### Hook Integration

```typescript
const {
  // Session Management
  initializeSession,
  startStream,
  endStream,
  pauseStream,
  resumeStream,

  // Quality
  updateQuality,
  checkBandwidth,

  // Interactivity
  sendMessage,
  createPoll,
  votePoll,
  sendReaction,
  sendSuperChat,

  // Recording
  startRecording,
  stopRecording,

  // Analytics
  getAnalytics,

  // State
  status,
  viewerCount,
  messages,
  polls,
  reactions,
  analytics,
} = useStreaming(userId);
```

---

## 🚀 API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/streaming/sessions/init` | POST | Initialize stream |
| `/api/streaming/sessions/start` | POST | Start broadcasting |
| `/api/streaming/sessions/end` | POST | End stream |
| `/api/streaming/analytics/[id]` | GET | Get analytics |
| `/api/streaming/quality/update` | POST | Update quality |
| `/api/streaming/bandwidth/recommend` | POST | Get recommendations |
| `/api/streaming/recommendations/[id]` | GET | AI recommendations |
| `/api/streaming/watch-party/create` | POST | Create watch party |

---

## 💡 Pro Tips

1. **Always check bandwidth** before streaming
   ```typescript
   const recommendation = getRecommendedQuality(bandwidth);
   ```

2. **Use auto-quality** for stable streams
   ```typescript
   autoQuality: true
   ```

3. **Enable recording** for archival
   ```typescript
   await startRecording();
   ```

4. **Monitor analytics** for insights
   ```typescript
   const analytics = getAnalytics();
   console.log(`Engagement: ${analytics.engagementRate}%`);
   ```

5. **Optimize for mobile** with adaptive bitrate
   ```typescript
   const quality = getOptimalBitrate(bandwidth);
   ```

6. **Use DRM** for premium content
   ```typescript
   security: { drm: { enabled: true } }
   ```

7. **Set geo-restrictions** if needed
   ```typescript
   allowedCountries: ["US", "CA", "GB"]
   ```

---

## 🔧 Troubleshooting

### Stream Won't Start
- Check Agora credentials
- Verify network connectivity
- Ensure sufficient bandwidth

### Chat Not Showing
- Check Socket.io connection
- Verify authentication
- Check browser console for errors

### Quality Switching Fails
- Verify HLS manifest
- Check CDN endpoints
- Monitor bandwidth

### Analytics Not Updating
- Ensure stream is active
- Check database connection
- Verify timestamp format

---

## 📊 Monitoring Dashboard

Track your streaming performance:

```typescript
const analytics = getAnalytics();

console.log("📊 Streaming Analytics:");
console.log(`👥 Viewers: ${analytics.totalViewers}`);
console.log(`📈 Peak: ${analytics.peakViewers}`);
console.log(`⏱️  Avg Duration: ${analytics.averageViewDuration}s`);
console.log(`💬 Engagement: ${analytics.engagementRate}%`);
console.log(`✅ Completion: ${analytics.completionRate}%`);
console.log(`💰 Revenue: $${analytics.revenue}`);
```

---

## 🎓 Learn More

- **Full Documentation**: See `STREAMING_INTEGRATION_COMPLETE.md`
- **Component Examples**: Check `/components/streaming/`
- **API Details**: Review endpoint implementations
- **SDK Source**: See `/lib/streaming-sdk/`

---

**Ready to stream? Let's go! 🚀**

**Next Step:** Deploy to Vercel and start your first stream!
