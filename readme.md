# Testing Glue42 Apps with Playwright

This repo contains a sample Glue42 end-to-end test created using [Playwright](https://playwright.dev/).

To run the test:

1. Install the dependencies:

```cmd
npm install
```

2. Open the `test.spec.js` file and make sure that the `gdDir` and `gdExePath` variables are set correctly for your [**Glue42 Enterprise**](https://glue42.com/enterprise/) deployment.

4. Execute the test:

```cmd
npm run test
```

*For more in-depth information on using Playwright, see the [Playwright official documentation](https://playwright.dev/docs/intro).*