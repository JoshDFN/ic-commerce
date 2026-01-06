# IC Commerce

> **Beta** - This project is under active development. APIs and features may change.

A full-featured, decentralized e-commerce platform built on the Internet Computer (ICP). Inspired by Solidus, it provides a complete storefront with admin dashboard, payment processing, and email notifications.

## Screenshots

### Storefront
![Storefront Home](screenshots/storefront/main.png)

![Product Catalog](screenshots/storefront/products.png)

### Admin Dashboard
![Admin Dashboard](screenshots/admin/dashboard.png)

### Product Management
![Products](screenshots/admin/products.png)

## Features

- **Storefront**: Product catalog, cart, checkout, order history
- **Admin Dashboard**: Products, orders, customers, revenue analytics, inventory management
- **Payments**: Stripe Checkout with secure server-side verification
- **Emails**: SendGrid integration for order confirmations and shipping notifications
- **Authentication**: Internet Identity for secure, passwordless login
- **On-chain Database**: SQLite running inside the canister

## Technology Stack

**Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4, react-router-dom 7

**Backend**: Rust, ic-sqlite, Candid

**Services**: Stripe (payments), SendGrid (emails), Internet Identity (auth)

**ICP SDK**: @icp-sdk/core 5.0, @icp-sdk/auth 5.0

## Quick Start

### Option 1: Local Installation (Recommended)

#### Prerequisites

- [Node.js](https://nodejs.org/) v22+ (LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install) 1.80+ (via rustup)
- [DFINITY SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (dfx 0.30+)

**Install Rust via rustup** (not Homebrew):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installing Rust, add the WebAssembly target and wasi2ic:
```bash
rustup target add wasm32-wasip1
cargo install wasi2ic
```

#### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ic-commerce

# Install dependencies
npm install

# Start local replica (--clean resets canister IDs)
dfx start --background --clean

# Remove stale .env (required after --clean)
rm -f .env

# Pull and deploy Internet Identity (required on first run)
dfx deps pull
dfx deps init
dfx deps deploy

# Deploy backend first (creates canister IDs and writes .env)
dfx deploy backend

# Deploy frontend (auto-runs setup-env.sh to add VITE_ variables)
dfx deploy frontend
```

---

### Option 2: Docker (Quick Testing)

**Pre-built image** (fastest):
```bash
docker run -p 4943:4943 -p 5173:5173 joshdfn/ic-commerce
```

**Or build from source**:
```bash
git clone https://github.com/JoshDFN/ic-commerce.git
cd ic-commerce
docker compose up --build
```

Wait for startup to complete. You'll see:
```
============================================
  IC Commerce is running!
============================================

  Storefront:  http://<canister-id>.localhost:4943
  Admin:       http://<canister-id>.localhost:4943/admin

  Dev Server:  http://localhost:5173
============================================
```

**Hot reload**: Edit files in `src/` and changes reflect immediately.

**Data Persistence**: Docker mode supports data persistence between restarts:
```bash
# Graceful stop (preserves data)
docker compose stop

# Restart (restores previous state)
docker compose start

# Full shutdown (keeps volumes)
docker compose down

# Complete reset (wipes all data)
docker compose down -v
```

> **Note**: Data persists only with graceful shutdown (`docker compose stop` or Ctrl+C). Abrupt termination may lose recent changes. For production data, deploy to IC mainnet.

### Access the App

After deployment, you'll see URLs like:
- **Storefront**: `http://<frontend-id>.localhost:4943/`
- **Admin Panel**: `http://<frontend-id>.localhost:4943/admin`

## Configuration

The app works out of the box for browsing and testing. Stripe and SendGrid are only needed if you want payment processing and email notifications.

### Stripe Setup (Optional - for payment processing)

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
   - **Publishable key**: `pk_test_...` (safe for frontend)
   - **Secret key**: `sk_test_...` (keep secure, never expose)
3. Set up a webhook endpoint:
   - Go to [Developers > Webhooks](https://dashboard.stripe.com/webhooks)
   - Add endpoint: `https://<your-backend-canister>.ic0.app/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy the **Signing secret**: `whsec_...`
4. In your Admin Panel, go to **Settings > Payment Methods > Configure Stripe**:
   - Enter your Publishable Key
   - Enter your Secret Key
   - Enter your Webhook Signing Secret
   - Enable the payment method

**Note**: Use test keys (`pk_test_`, `sk_test_`) for development. Switch to live keys for production.

### SendGrid Setup (Optional - for email notifications)

1. Create a [SendGrid account](https://signup.sendgrid.com/)
2. Create an API key at [Settings > API Keys](https://app.sendgrid.com/settings/api_keys)
   - Give it "Full Access" or at minimum "Mail Send" permissions
   - API key format: `SG.xxxxxx...`
3. Verify a sender email at [Settings > Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
4. In your Admin Panel, go to **Settings > Email Settings**:
   - Enter your SendGrid API Key
   - Enter your verified sender email
   - Enable email sending
5. Test with **Settings > Email Templates > Send Test Email**

### Admin Access

The first user to authenticate becomes an Admin. Subsequent users are Customers by default.

To make additional admins, you can update user roles in **Admin > Customers**.

## Project Structure

```
ic-commerce/
├── src/
│   ├── backend/           # Rust backend canister
│   │   ├── src/
│   │   │   ├── lib.rs     # Main canister logic
│   │   │   └── types.rs   # Type definitions
│   │   └── migrations/    # SQLite migrations
│   ├── declarations/      # Generated Candid bindings
│   ├── components/        # React components
│   ├── pages/             # Page components
│   │   └── admin/         # Admin dashboard pages
│   ├── hooks/             # React hooks
│   └── lib/               # Utilities
├── dfx.json               # IC configuration
└── package.json           # Node dependencies
```

## Development

```bash
# Start dev server (frontend only, hot reload)
npm run dev

# Rebuild and deploy backend
dfx deploy backend

# Rebuild and deploy frontend
dfx deploy frontend

# Check Rust code
cargo check --target wasm32-wasip1 -p backend

# Generate Candid declarations
dfx generate
```

## Mainnet Deployment

> **Note**: Docker is for development/testing only. For production with persistent data, deploy to IC mainnet.

### Prerequisites

1. **Cycles**: You need ICP tokens converted to cycles. Deployment costs approximately 1-2T cycles.
2. **dfx identity**: Create or use an existing identity:
   ```bash
   dfx identity new my-mainnet-identity
   dfx identity use my-mainnet-identity
   ```

### Option A: Deploy with dfx (Recommended)

```bash
# Create canisters on mainnet (first time only)
dfx canister create --network ic --all

# Deploy backend first
dfx deploy backend --network ic

# Deploy frontend
dfx deploy frontend --network ic

# Check cycles balance
dfx cycles balance --network ic
```

### Option B: Deploy from Docker Build Artifacts (CI/CD)

Build artifacts in Docker, then deploy them:

```bash
# Build artifacts
docker build -f Dockerfile.prod -t ic-commerce-build .
docker run --rm -v $(pwd)/build-output:/output ic-commerce-build

# Deploy backend WASM
dfx canister install backend --network ic --mode install --wasm build-output/backend_ic.wasm

# Deploy frontend
dfx deploy frontend --network ic
```

### After Deployment

Your app will be available at:
- **Storefront**: `https://<frontend-canister-id>.ic0.app`
- **Admin**: `https://<frontend-canister-id>.ic0.app/admin`

### Production Checklist

- [ ] Switch Stripe to **live API keys** (not test keys)
- [ ] Use a production SendGrid account with verified sender domain
- [ ] Update Stripe webhook URL to mainnet canister URL
- [ ] Consider setting up a custom domain via [boundary nodes](https://internetcomputer.org/docs/current/developer-docs/web-apps/custom-domains/using-custom-domains)
- [ ] Monitor cycles balance and top up as needed

## Troubleshooting

### dfx start fails or hangs
If you have other dfx projects running, stop them first:
```bash
dfx killall
dfx stop
```

### "Function not found" errors
Run `dfx generate` to regenerate Candid bindings after backend changes.

### Stale canister IDs after clean restart
If you run `dfx start --clean`, delete the old .env file and redeploy:
```bash
rm .env
dfx deploy backend
dfx deploy frontend
```

### Login fails after restart
After `dfx start --clean` or restarting a Docker container, your browser may have cached Internet Identity credentials for anchors that no longer exist. The app should automatically clear stale auth, but if you still have issues:
1. Clear your browser's site data for `localhost:4943`
2. Or open DevTools → Application → Storage → Clear site data
3. Refresh and try logging in again

### "Canister ID is required" error
This means the Vite environment variables are missing. Redeploy the frontend:
```bash
dfx deploy frontend
```

### Payment verification failing
Ensure your Stripe webhook secret is correctly configured in Payment Methods settings.

### Emails not sending
1. Verify SendGrid API key has Mail Send permissions
2. Verify sender email is authenticated in SendGrid
3. Check that email settings are enabled in Admin > Settings > Email Settings

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Reporting Issues

- **Bug reports**: [Open a bug report](https://github.com/JoshDFN/ic-commerce/issues/new?template=bug_report.md)
- **Feature requests**: [Request a feature](https://github.com/JoshDFN/ic-commerce/issues/new?template=feature_request.md)
- **Questions**: [Open a discussion](https://github.com/JoshDFN/ic-commerce/issues)

## Credits

- **[Solidus](https://github.com/solidusio/solidus)**: This project's data model and admin UX design were inspired by Solidus, an open-source e-commerce platform for Ruby on Rails. The implementation is entirely new, written in Rust for the Internet Computer.
- **[DFINITY](https://internetcomputer.org/)**: Internet Computer platform
- **[ic-sqlite](https://github.com/AmbroseFernandes/ic-sqlite)**: SQLite for IC canisters

## License

[MIT](LICENSE)
