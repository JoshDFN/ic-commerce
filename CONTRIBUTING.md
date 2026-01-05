# Contributing to IC Commerce

Thank you for your interest in contributing to IC Commerce! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful and constructive in all interactions. We're building something together.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](../../issues) to see if it's already reported
2. If not, [create a new issue](../../issues/new?template=bug_report.md) using the bug report template
3. Include as much detail as possible: steps to reproduce, expected vs actual behavior, environment info

### Suggesting Features

1. Check [existing issues](../../issues) to see if it's already suggested
2. [Create a new issue](../../issues/new?template=feature_request.md) using the feature request template
3. Explain the problem you're solving and your proposed solution

### Submitting Code

All contributions require approval. Here's the process:

#### 1. Before You Start

- **Open an issue first** to discuss significant changes
- For small fixes (typos, obvious bugs), you can submit a PR directly
- Make sure no one else is already working on the same thing

#### 2. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/ic-commerce.git
cd ic-commerce
```

#### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Use descriptive branch names:
- `feature/add-wishlist`
- `fix/cart-quantity-validation`
- `docs/update-setup-instructions`

#### 4. Make Your Changes

- Follow the existing code style
- Keep changes focused and minimal
- Test your changes thoroughly

#### 5. Test Locally

```bash
# Local development
dfx start --background --clean
rm -f .env
dfx deps pull && dfx deps init && dfx deps deploy
dfx deploy backend
dfx deploy frontend
npm run dev

# Or with Docker
docker compose up --build
```

Verify:
- The app builds without errors
- Your changes work as expected
- Existing functionality still works

#### 6. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git commit -m "Add wishlist feature to product pages"
```

Good commit messages:
- Start with a verb (Add, Fix, Update, Remove, Refactor)
- Describe what the change does, not how
- Keep the first line under 72 characters

#### 7. Submit a Pull Request

1. Push your branch: `git push origin feature/your-feature-name`
2. Open a PR against the `main` branch
3. Fill out the PR template completely
4. Wait for review

## Pull Request Requirements

Every PR must include:

- **Clear description** of what changes were made and why
- **Type of change** (bug fix, feature, etc.)
- **Testing performed** - how you verified the changes work
- **Screenshots** for UI changes

PRs will be reviewed for:
- Code quality and consistency
- Security implications
- Performance impact
- Test coverage
- Documentation updates if needed

## Development Setup

### Prerequisites

**Option 1: Local**
- Node.js 22+
- Rust 1.80+ (via rustup, not Homebrew)
- dfx 0.30+
- wasi2ic (`cargo install wasi2ic`)

**Option 2: Docker**
- Docker and Docker Compose

### Project Structure

```
ic-commerce/
├── src/
│   ├── backend/           # Rust canister
│   │   ├── src/lib.rs     # Main backend logic
│   │   └── migrations/    # SQLite migrations
│   ├── components/        # React components
│   ├── pages/             # React pages
│   │   └── admin/         # Admin dashboard
│   ├── hooks/             # React hooks
│   └── lib/               # Utilities
├── dfx.json               # IC configuration
└── package.json
```

### Code Style

**Rust (Backend)**
- Use `cargo fmt` before committing
- Run `cargo clippy` and address warnings
- Handle errors properly (avoid `.unwrap()` in production paths)

**TypeScript (Frontend)**
- Use TypeScript types, avoid `any`
- Use functional components with hooks
- Follow existing patterns in the codebase

### Running Tests

```bash
# Check Rust code
cargo check --target wasm32-wasip1 -p backend
cargo clippy --target wasm32-wasip1 -p backend

# Build frontend
npm run build
```

## Areas for Contribution

Looking to contribute but not sure where to start?

### Good First Issues

- Improving error messages
- Adding input validation
- Writing documentation
- Fixing typos

### Medium Complexity

- Adding new admin features
- Improving UI/UX
- Performance optimizations
- Adding tests

### Advanced

- New payment integrations
- Database schema changes
- Authentication improvements
- Security enhancements

## Questions?

- Open an issue for technical questions
- Check the README for setup help

Thank you for contributing!
