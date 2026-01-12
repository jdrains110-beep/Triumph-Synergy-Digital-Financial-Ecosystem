# Contributing to Triumph Synergy

Thank you for your interest in contributing to Triumph Synergy! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.12.3+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for local database)

### Setting Up Your Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/triumph-synergy.git
   cd triumph-synergy
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development credentials
   ```

4. **Start local services**
   ```bash
   pnpm db:start  # Starts PostgreSQL and Redis via Docker
   ```

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `chore/*` - Maintenance tasks

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Follow existing code style and conventions
   - Add tests for new functionality

3. **Test your changes**
   ```bash
   pnpm lint          # Check code quality
   pnpm build         # Ensure build succeeds
   pnpm test          # Run test suite
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode checks
- Provide proper type annotations
- Avoid `any` types when possible

### Code Style

- Follow existing code formatting
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic

### File Organization

- Place components in `components/`
- Place utility functions in `lib/utils/`
- Place API routes in `app/api/`
- Place types in `types/`

### Linting

The project uses Ultracite (a wrapper around Biome) for linting and formatting:

```bash
pnpm lint          # Check for issues
pnpm format        # Auto-fix formatting issues
```

## Testing

### Running Tests

```bash
pnpm test          # Run all tests
```

### Writing Tests

- Write tests for new features and bug fixes
- Use Playwright for E2E tests
- Place tests in the `tests/` directory
- Follow existing test patterns

### Test Coverage

- Aim for meaningful test coverage
- Test edge cases and error conditions
- Test user-facing functionality

## Pull Request Process

### Before Submitting

1. **Update documentation** - Update README.md and other docs as needed
2. **Run tests** - Ensure all tests pass
3. **Lint your code** - Fix any linting errors
4. **Update CHANGELOG.md** - Add an entry for your changes
5. **Rebase on main** - Ensure your branch is up to date

### Submitting a Pull Request

1. **Open a Pull Request** against the `main` branch
2. **Fill out the PR template** completely
3. **Link related issues** using "Fixes #123" or "Closes #123"
4. **Request review** from maintainers
5. **Address feedback** promptly and professionally

### PR Title Format

Use conventional commits format:

- `feat: add new payment method`
- `fix: resolve authentication error`
- `docs: update deployment guide`
- `chore: update dependencies`
- `test: add integration tests`

### Review Process

- At least one maintainer approval is required
- CI/CD checks must pass
- Code must be properly tested
- Documentation must be updated

## Reporting Bugs

### Before Reporting

1. **Check existing issues** to avoid duplicates
2. **Test on the latest version**
3. **Gather relevant information** (logs, screenshots, steps to reproduce)

### Bug Report Template

Use the bug report issue template and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots or error messages
- Potential solutions (if known)

## Suggesting Enhancements

### Feature Requests

When suggesting enhancements:

1. **Use the feature request template**
2. **Describe the use case** - Why is this needed?
3. **Provide examples** - How would it work?
4. **Consider alternatives** - What other solutions exist?

### Enhancement Guidelines

- Features should align with project goals
- Consider impact on existing functionality
- Discuss major changes before implementing
- Break large features into smaller PRs

## Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead, please review our [SECURITY_POLICY.md](SECURITY_POLICY.md) and follow the responsible disclosure process.

## Documentation

Good documentation is crucial:

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update relevant guides in `docs/`
- Include examples where helpful

## Questions?

- Open a discussion in GitHub Discussions
- Ask in pull request comments
- Review existing documentation

## License

By contributing to Triumph Synergy, you agree that your contributions will be licensed under the project's license (see [LICENSE](LICENSE)).

## Recognition

Contributors are recognized in:
- CHANGELOG.md for their contributions
- GitHub contributors page

Thank you for contributing to Triumph Synergy! 🚀
