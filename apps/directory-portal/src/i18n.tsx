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
