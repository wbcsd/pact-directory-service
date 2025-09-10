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
