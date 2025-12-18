# Contributing to EventStream Pro

First off, thank you for considering contributing to EventStream Pro! It's people like you that make the open-source community such a great place to learn, inspire, and create.

## How Can I Contribute?

### Reporting Bugs
If you find a bug, please create an issue on GitHub. Include:
- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected vs Actual behavior.
- Screenshots if applicable.

### Suggesting Enhancements
We love new ideas! Please open an issue to discuss your suggestions.

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. Install dependencies: `npm install`.
3. Make your changes.
4. Ensure the build passes: `npm run build`.
5. Submit a pull request.

## Development Setup

The project is split into two main parts:
- `/extension`: Core extension logic (Background, Injected scripts).
- `/panel`: React-based DevTools panel UI.

To build the project, run `npm run build` in the root directory. This will compile the React app and bundle it with the extension files into the `/dist` directory.

## Code of Conduct
Please be respectful and helpful to others in the community.

## License
By contributing, you agree that your contributions will be licensed under its MIT License.
