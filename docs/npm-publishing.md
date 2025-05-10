# Publishing to npm

This guide covers the process of publishing the Web3CLI package to npm under the `@web3ai` scope.

## Prerequisites

1. An npm account
2. Local npm login: `npm login`
3. Node.js 16 or newer installed
4. pnpm installed (`npm install -g pnpm`)

## Creating the Scope

If the `@web3ai` scope doesn't exist or you don't have access to it, you need to create it:

1. Create a free organization on npm:
   - Go to https://www.npmjs.com/org/create
   - Enter "web3ai" as the organization name
   - Choose the Free plan
   - Complete the organization creation process

2. Or create the scope during first publish:
   - When you publish with `--access public`, npm will create the scope if it doesn't exist
   - You must be logged in with `npm login`

## Publishing Process

### Automated Publishing

The easiest way to publish is using our scripts:

#### On Windows:
```
scripts\publish-npm.bat
```

#### On macOS/Linux:
```
chmod +x scripts/publish-npm.sh
./scripts/publish-npm.sh
```

### Manual Publishing

If you prefer to publish manually:

1. Update the version in `package.json`
   ```bash
   # For patch releases (bug fixes)
   npm version patch
   
   # For minor releases (new features)
   npm version minor
   
   # For major releases (breaking changes)
   npm version major
   ```

2. Build the package
   ```bash
   pnpm build
   ```

3. Publish the package
   ```bash
   npm publish --access public
   ```

## Scoped Package Explanation

Web3CLI is published under the `@web3ai` scope as `@web3ai/cli`. Scoped packages provide several benefits:

- Namespace protection: Ensures our package name is unique
- Organization grouping: Allows grouping related packages together
- Access control: Simplifies permission management for multiple packages

## Installation

After publishing, users can install the package globally with:

```bash
npm install -g @web3ai/cli
```

Or with pnpm:

```bash
pnpm add -g @web3ai/cli
```

## Versioning Guidelines

We follow semantic versioning (semver):

- **Patch** (1.0.x): Bug fixes and minor changes that don't affect APIs
- **Minor** (1.x.0): New features in a backward-compatible manner
- **Major** (x.0.0): Breaking changes that require user action to update

Always document changes in CHANGELOG.md before publishing.

## Troubleshooting

### Common Issues

#### "You need to authenticate"
Run `npm login` before publishing.

#### "You do not have permission to publish"
Ensure you're a member of the @web3ai organization with publish rights.

#### "Scope not found"
The @web3ai scope doesn't exist. Create it first using the instructions in the "Creating the Scope" section.

#### "Package name already exists"
Someone else has already published a package with the same name. Double-check the package name in package.json.

#### Build errors
Run `pnpm build` manually to see detailed errors before publishing. 