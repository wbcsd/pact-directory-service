import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "companyprofile.requestStatus.pending":
        "Your connection request is pending approval from this organization.",
      "companyprofile.requestStatus.norequest":
        "When you click Connect, PACT Identity Management Service will send a request to this company, requesting their permission to create an authenticated connection between your PACT Conformant Solution and theirs.",
      "companyprofile.requestStatus.accepted":
        "You are connected with this organization.",
      "companyprofile.requestStatus.received":
        "This organization has sent you a connection request, you can accept it in the Manage Connections page.",
      "companyprofile.status.pending": "Pending",
      "companyprofile.status.norequest": "Connect",
      "companyprofile.status.accepted": "Connected",
      "companyprofile.profile.companyIdentifier": "Company Identifier",
      "companyprofile.profile.companyIdentifierDescription":
        "Company Identifier Description",
      "companyprofile.profile.fullName": "Account Admin Full Name",
      "companyprofile.profile.apiConfig": "Api Configuration",
      "companyprofile.profile.adminEmail": "Account Admin Email",
      "companyprofile.profile.networKey": "Network Key",
      "companyprofile.profile.solutionApiUrl": "Solution API URL",
      "conformancetesting.title": "Conformance Testing",
      "conformancetesting.subtitle":
        "Configure your API and authentication details below.",

      "conformancetesting.form.solutionApiUrl.label": "Solution API URL",
      "conformancetesting.form.solutionApiUrl.placeholder":
        "https://api.example.com",

      "conformancetesting.form.authBaseUrl.label": "Auth Base URL",
      "conformancetesting.form.authBaseUrl.placeholder":
        "https://auth.example.com",

      "conformancetesting.form.clientId.label": "Client ID",
      "conformancetesting.form.clientId.placeholder":
        "Client ID used for authentication by ACT",

      "conformancetesting.form.clientSecret.label": "Client Secret",
      "conformancetesting.form.clientSecret.placeholder":
        "Secret used for authentication by ACT",

      "conformancetesting.form.scope.label": "Scope",
      "conformancetesting.form.scope.placeholder":
        "Scope used for authentication",

      "conformancetesting.form.audience.label": "Audience",
      "conformancetesting.form.audience.placeholder":
        "Audience used for authentication",

      "conformancetesting.form.resource.label": "Resource",
      "conformancetesting.form.resource.placeholder":
        "Resource used for authentication",

      "conformancetesting.form.techSpecsVersion.label": "Tech Specs Version",
      "conformancetesting.form.techSpecsVersion.v20": "2.0 (beta)",
      "conformancetesting.form.techSpecsVersion.v21": "2.1 (beta)",
      "conformancetesting.form.techSpecsVersion.v22": "2.2 (beta)",
      "conformancetesting.form.techSpecsVersion.v23": "2.3 (beta)",
      "conformancetesting.form.techSpecsVersion.v30": "3.0 (beta)",

      "conformancetesting.form.runTests": "Run tests",

      "conformancetesting.guidance.title": "Tech guidance",

      "conformancetesting.guidance.solutionApiBaseUrl.title":
        "Solution API Base URL",
      "conformancetesting.guidance.solutionApiBaseUrl.text1":
        "Enter the base URL of your PACT Conformant API implementation. This URL will be used as the root endpoint for all API requests during the conformance testing process.",
      "conformancetesting.guidance.solutionApiBaseUrl.text2":
        "The URL should be in the format https://yourdomain.com/api (without a trailing slash). Make sure your endpoint is accessible from the internet and has valid SSL certification.",

      "conformancetesting.guidance.authBaseUrlOptional.title":
        "Auth Base URL (optional)",
      "conformancetesting.guidance.authBaseUrlOptional.text1":
        "If your implementation uses a separate authentication service, provide its base URL here. This field is optional if your authentication endpoints are part of the main API URL.",
      "conformancetesting.guidance.authBaseUrlOptional.text2":
        "The authentication service should support the OAuth 2.0 protocol with client credentials flow as specified in the PACT Technical Specifications.",

      "conformancetesting.guidance.clientId.title": "Client ID",
      "conformancetesting.guidance.clientId.text":
        "Provide the Client ID that will be used to authenticate API requests during conformance testing. This ID should have sufficient permissions to access all endpoints required by the PACT specification.",

      "conformancetesting.guidance.clientSecret.title": "Client Secret",
      "conformancetesting.guidance.clientSecret.text":
        "Enter the Client Secret associated with your Client ID. This will be used along with the Client ID to obtain access tokens for authenticated API requests during testing.",

      "conformancetesting.guidance.otherAuthOptions.title":
        "Other Authentication Options",
      "conformancetesting.guidance.otherAuthOptions.text":
        "Common OAuth options like Scope, Resource and Audience are also available for configuration. Make sure to set these according to your API's requirements.",

      "conformancetesting.guidance.techSpecsVersion.title":
        "Tech Specs Version",
      "conformancetesting.guidance.techSpecsVersion.text1":
        "The PACT Technical Specifications describe the PCF data model and API requirements that your implementation must conform to. Select the version that your solution implements.",
      "conformancetesting.guidance.techSpecsVersion.text2":
        "A given version is in beta if the testing suite has not yet been tested by a sufficient number of organizations for that version; the tool can nevertheless still be used to grant PACT Conformance status, but organizations may be subject to mandatory retesting, as per our policy.",

      "conformancetestresult.title": "Conformance Test Result",
      "conformancetestresult.loading.inProgress": "Tests in progress ...",
      "conformancetestresult.loading.results": "Loading test results ...",
      "conformancetestresult.errors.fetchResults":
        "An unexpected error occurred while fetching test results. Please try again.",
      "conformancetestresult.errors.runTests":
        "An unexpected error occurred while running tests. Please try again.",
      "conformancetestresult.actions.backToForm": "Back to Testing Form",
      "conformancetestresult.actions.retest": "Re-test Conformance",
      "conformancetestresult.actions.details": "Details",
      "conformancetestresult.actions.closePanel": "Close Panel",
      "conformancetestresult.actions.viewDocumentation":
        "View test documentation",
      "conformancetestresult.testRunId": "Test Run ID",
      "conformancetestresult.testingConformance":
        "Testing conformance to {{version}}",
      "conformancetestresult.reviewMessage":
        "Review the test cases that were executed against your API",
      "conformancetestresult.mandatoryTests": "Mandatory Tests",
      "conformancetestresult.optionalTests": "Optional Tests",
      "conformancetestresult.status.passed": "Passed",
      "conformancetestresult.status.failed": "Failed",
      "conformancetestresult.status.pending": "Pending",
      "conformancetestresult.status.warning": "Warning",
      "conformancetestresult.table.testCase": "Test Case",
      "conformancetestresult.table.status": "Status",
      "conformancetestresult.table.mandatory": "Mandatory Test?",
      "conformancetestresult.noTests": "No test cases available.",
      "conformancetestresult.noErrors": "No errors.",
      "conformancetestresult.mandatory": "Mandatory",
      "conformancetestresult.optional": "Optional",

      "conformancetestresult.mandatoryYes": "Yes",
      "conformancetestresult.mandatoryNo": "No",

      "conformancetestruns.header.title": "Overview",
      "conformancetestruns.header.subtitle":
        "Showing runs from all conformance tests",

      "conformancetestruns.search.placeholder":
        "Press enter to search by company name, email address or user name",
      "conformancetestruns.search.clear": "Clear search",

      "conformancetestruns.actions.runTests": "Run Tests",

      "conformancetestruns.empty.alt": "No results",
      "conformancetestruns.empty.noResults": "No results for “{{query}}”",
      "conformancetestruns.empty.hint":
        "Try a different term, or clear your search to see all test runs.",

      "conformancetestruns.errors.fetch":
        "An unexpected error occurred while fetching test runs. Please try again.",

      "conformancetestrunsgrid.title": "Conformance Test Runs",

      "conformancetestrunsgrid.actions.backToForm": "Back to Testing Form",
      "conformancetestrunsgrid.actions.runTests": "Run Tests",

      "conformancetestrunsgrid.empty.alt": "No tests yet",
      "conformancetestrunsgrid.empty.title": "You currently have no tests",
      "conformancetestrunsgrid.empty.hint":
        "Start automated testing to ensure a PACT conformant solution",

      "conformancetestrunsgrid.table.testRunId": "Test Run ID",
      "conformancetestrunsgrid.table.company": "Company",
      "conformancetestrunsgrid.table.email": "Email",
      "conformancetestrunsgrid.table.status": "Status",
      "conformancetestrunsgrid.table.version": "Version",
      "conformancetestrunsgrid.table.runDate": "Run Date/Time CET",

      "forgotpassword.hero.title": "Helping you adopt PACT standards with ease",

      "forgotpassword.success.title": "Check Your Email",
      "forgotpassword.success.message":
        "If an account with that email exists, we've sent you a password reset link. Please check your email and click the link to reset your password.",

      "forgotpassword.form.title": "Reset Your Password",
      "forgotpassword.form.subtitle":
        "Enter your email address and we'll send you a link to reset your password.",
      "forgotpassword.form.emailLabel": "Email Address",
      "forgotpassword.form.emailPlaceholder": "Enter your email address",

      "forgotpassword.validation.required": "Email is required.",
      "forgotpassword.validation.invalid":
        "Please enter a valid email address.",

      "forgotpassword.actions.sending": "Sending...",
      "forgotpassword.actions.sendLink": "Send Reset Link",
      "forgotpassword.actions.backToLogin": "Back to Login",

      "forgotpassword.errors.generic": "An error occurred. Please try again.",
      "forgotpassword.errors.tryAgainLater":
        "An error occurred. Please try again later.",

      "forgotpassword.help.text": "Need help? Contact us at:",

      "login.hero.title": "Helping you adopt PACT standards with ease",

      "login.title": "Log in to PACT Network Services",

      "login.form.emailLabel": "Email Address",
      "login.form.emailPlaceholder": "Enter your email",
      "login.form.passwordLabel": "Password",
      "login.form.passwordPlaceholder": "Enter your password",

      "login.validation.emailRequired": "Email is required.",
      "login.validation.passwordRequired": "Password is required.",

      "login.actions.submit": "Login",
      "login.actions.forgotPassword": "Forgot your password?",

      "login.errors.invalidCredentials": "Invalid email or password",
      "login.errors.generic": "An error occurred during login",

      "login.help.text": "Need help? Contact us at:",

      "manageconnections.title": "Manage Connections",

      "manageconnections.dialog.acceptedTitle": "Connection request accepted",
      "manageconnections.dialog.acceptedDescription":
        "Now you are able to exchange PCF data using your PACT Conformant Solution with the company you just connected with",
      "manageconnections.dialog.ok": "Ok",

      "manageconnections.connectedOrgs.title": "Connected organizations",
      "manageconnections.connectedOrgs.connectedOn": "Connected on {{date}}",
      "manageconnections.connectedOrgs.empty": "No connected organizations.",

      "manageconnections.sentRequests.title": "Sent Connection Requests",
      "manageconnections.sentRequests.status":
        "Status: {{status}} | Sent on {{date}}",
      "manageconnections.sentRequests.empty": "No sent connection requests.",
      "manageconnections.sentRequests.searchLink": "Search for companies",

      "manageconnections.receivedRequests.title":
        "Received Connection Requests",
      "manageconnections.receivedRequests.status":
        "Status: {{status}} | Received on {{date}}",
      "manageconnections.receivedRequests.accept": "Accept request",
      "manageconnections.receivedRequests.empty":
        "No received connection requests.",

      "myprofile.title": "My Profile",

      "myprofile.companyIdentifier": "Company Identifier",
      "myprofile.companyIdentifierDescription":
        "Company Identifier Description",
      "myprofile.adminFullName": "Account Admin Full Name",
      "myprofile.adminEmail": "Account Admin Email",
      "myprofile.solutionApiUrl": "Solution API URL",

      "myprofile.credentials.title": "Credentials",
      "myprofile.credentials.show": "Show Credentials",
      "myprofile.credentials.hide": "Hide Credentials",

      "myprofile.networkKey": "Network Key",
      "myprofile.clientId": "ClientId",
      "myprofile.clientSecret": "ClientSecret",

      "resetpassword.hero.title": "Helping you adopt PACT standards with ease",

      "resetpassword.verifying": "Verifying reset link...",

      "resetpassword.errors.invalidLink": "Invalid reset link",
      "resetpassword.errors.expiredLink": "Invalid or expired reset link",
      "resetpassword.errors.verification":
        "An error occurred while verifying the reset link",
      "resetpassword.errors.passwordMismatch": "Passwords do not match",
      "resetpassword.errors.passwordTooShort":
        "Password must be at least 6 characters long",
      "resetpassword.errors.generic": "An error occurred",
      "resetpassword.errors.tryAgain":
        "An error occurred. Please try again later.",

      "resetpassword.invalid.title": "Invalid Reset Link",
      "resetpassword.invalid.description":
        "This reset link is invalid or has expired. Please request a new one.",
      "resetpassword.invalid.requestNew": "Request New Reset Link",
      "resetpassword.invalid.backToLogin": "Back to Login",

      "resetpassword.success.title": "Password Reset Successful",
      "resetpassword.success.description":
        "Your password has been successfully reset. You will be redirected to the login page shortly.",
      "resetpassword.success.goToLogin": "Go to Login",

      "resetpassword.form.title": "Set New Password",
      "resetpassword.form.subtitle": "Enter your new password below.",
      "resetpassword.form.newPassword": "New Password",
      "resetpassword.form.newPasswordPlaceholder": "Enter new password",
      "resetpassword.form.confirmPassword": "Confirm New Password",
      "resetpassword.form.confirmPasswordPlaceholder": "Confirm new password",

      "resetpassword.validation.required": "Password is required.",
      "resetpassword.validation.tooShort":
        "Password must be at least 6 characters long.",
      "resetpassword.validation.confirmRequired":
        "Please confirm your password.",

      "resetpassword.actions.resetting": "Resetting...",
      "resetpassword.actions.submit": "Reset Password",

      "resetpassword.help.text": "Need help? Contact us at:",

      "searchpage.title": "Search Companies",
      "searchpage.placeholder": "Search by company name",
      "searchpage.actions.search": "Search",
      "searchpage.noResults": "No results found.",

      "searchpage.table.companyName": "Company Name",
      "searchpage.table.companyIdentifier": "Company Identifier",
      "searchpage.table.adminEmail": "Account Admin Email",

      "signuppage.hero.title": "Helping you adopt PACT standards with ease",
      "signuppage.title": "Sign up to PACT Network Services",

      "signuppage.fields.companyName.label": "Company Name",
      "signuppage.fields.companyName.placeholder": "Enter company name",
      "signuppage.fields.companyName.tooltip":
        "The full registered/legal name of your company.",
      "signuppage.fields.companyName.required": "Company name is required.",

      "signuppage.fields.fullName.label": "Account Admin Full Name",
      "signuppage.fields.fullName.placeholder": "Enter your full name",
      "signuppage.fields.fullName.tooltip":
        "Name of the person / mailbox to serve as account admin and point of contact for your account.",
      "signuppage.fields.fullName.required": "Your name is required.",

      "signuppage.fields.email.label": "Account Admin Email",
      "signuppage.fields.email.placeholder": "Enter your email address",
      "signuppage.fields.email.tooltip":
        "Email address of account admin, to be used to log in and receive notifications.",
      "signuppage.fields.email.required": "Email is required.",
      "signuppage.fields.email.invalid": "Invalid email.",

      "signuppage.fields.password.label": "Password",
      "signuppage.fields.password.placeholder": "Enter password",
      "signuppage.fields.password.tooltip":
        "Your password must be at least 6 characters long.",
      "signuppage.fields.password.required": "Password is required.",
      "signuppage.fields.password.tooShort":
        "Password needs to be at least 6 characters long.",

      "signuppage.fields.confirmPassword.label": "Confirm Password",
      "signuppage.fields.confirmPassword.placeholder": "Confirm your password",
      "signuppage.fields.confirmPassword.tooltip":
        "Please confirm your password.",
      "signuppage.fields.confirmPassword.required":
        "Please confirm your password.",
      "signuppage.fields.confirmPassword.mismatch": "Passwords do not match.",

      "signuppage.terms": "By signing up you agree to our",
      "signuppage.terms.termsOfUse": "Terms of Use",
      "signuppage.terms.and": "and",
      "signuppage.terms.privacyPolicy": "Privacy Policy",

      "signuppage.actions.creating": "Creating Account",
      "signuppage.actions.join": "Join",

      "signuppage.help": "Need help? Contact us at:",

      "signuppage.error.default":
        "Error during sign up, please check your data.",
    },
  },
  fr: {
    translation: {
      "Welcome to React": "Bienvenue à React et react-i18next",
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
