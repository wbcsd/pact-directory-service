import type { Step } from "react-joyride";
import type { Policy } from "@wbcsd/pact-policies";
import { featureFlags } from "./feature-flags";

/**
 * A tour step that optionally knows which route it belongs to. The tour runner
 * navigates there before showing the step.
 */
export interface ProductTourStep extends Step {
  /** Route the step lives on. Omit for steps that work on any authenticated page. */
  route?: string;
}

const CONFORMANCE_ROUTE = "/conformance-test-runs";
const NODES_ROUTE = "/nodes";

const NODE_POLICIES: Policy[] = [
  "view-nodes-own-organization",
  "view-nodes-all-organizations",
];

/**
 * Builds the tour, dropping sections the user cannot reach so the walkthrough
 * never points at a menu item that is hidden by a feature flag or policy.
 */
export function buildProductTourSteps(policies: Policy[] = []): ProductTourStep[] {
  const canSeeNodes =
    featureFlags.enableNodeManagement &&
    NODE_POLICIES.some((policy) => policies.includes(policy));

  const steps: ProductTourStep[] = [
    {
      target: "body",
      placement: "center",
      disableBeacon: true,
      title: "Welcome to the PACT Directory",
      content:
        "This short tour walks you through the main areas of the application: the navigation menu, conformance testing, and the PACT Network. It takes about a minute, and you can leave at any time.",
      route: CONFORMANCE_ROUTE,
    },
    {
      target: '[data-tour="sidebar"]',
      placement: "right",
      disableBeacon: true,
      title: "Your navigation menu",
      content:
        "Everything in the application is reachable from this menu. It is grouped by what you want to do: run conformance tests, exchange data over the PACT Network, and manage your settings.",
    },
    {
      target: '[data-tour="nav-services"]',
      placement: "right",
      title: "Services",
      content:
        "Services are the tools PACT provides to you. Today that is Conformance Testing, which verifies that your solution implements the PACT Technical Specifications correctly.",
    },
    {
      target: '[data-tour="nav-exchange"]',
      placement: "right",
      title: "Exchange",
      content:
        "Exchange is where you work with the PACT Network: the nodes that hold your Product Carbon Footprint data, the connections between them, and the activity log of everything that moved through them.",
    },
    {
      target: '[data-tour="nav-settings"]',
      placement: "right",
      title: "Settings",
      content:
        "Manage your own profile here, and — if you are an administrator — the users and organizations you are responsible for.",
    },

    // --- Conformance testing ---
    {
      target: '[data-tour="nav-conformance"]',
      placement: "right",
      title: "Conformance Testing",
      content:
        "Conformance testing checks your solution against the PACT Technical Specifications. Passing it is how you demonstrate that your implementation can exchange PCF data with any other PACT conformant system.",
      route: CONFORMANCE_ROUTE,
    },
    {
      target: '[data-tour="page-header"]',
      placement: "bottom",
      title: "Your test runs",
      content:
        "Each time you test your solution a new run is recorded here, so you can track your progress as you work towards a fully conformant implementation.",
      route: CONFORMANCE_ROUTE,
    },
    {
      target: '[data-tour="page-actions"]',
      placement: "bottom",
      title: "Run a test",
      content:
        "Start a new test run from here. You supply the API credentials for your solution, and PACT exercises the specification's endpoints against it.",
      route: CONFORMANCE_ROUTE,
    },
    {
      target: ".data-table-with-search",
      placement: "top",
      title: "Reading the results",
      content:
        "Every run gets an overall pass or fail status. Open a run to see each individual test case, the request that was sent, the response your solution returned, and what was expected.",
      route: CONFORMANCE_ROUTE,
    },

    // --- PACT Network ---
    ...(canSeeNodes
      ? ([
          {
            target: '[data-tour="nav-nodes"]',
            placement: "right",
            title: "The PACT Network",
            content:
              "The PACT Network is made up of nodes. A node is a PACT conformant endpoint that holds PCF records and can exchange them with other nodes — yours or your partners'.",
            route: NODES_ROUTE,
          },
          {
            target: '[data-tour="page-header"]',
            placement: "bottom",
            title: "Your nodes",
            content:
              "This is every node your organization can see. Open one to manage its Product Carbon Footprint records, its connections, and the PCF requests flowing in and out of it.",
            route: NODES_ROUTE,
          },
          {
            target: '[data-tour="page-actions"]',
            placement: "bottom",
            title: "Adding a node",
            content:
              "Register a node by giving it a name and the API URL of your PACT conformant solution. You can register more than one — for example a test node and a production node.",
            route: NODES_ROUTE,
          },
          {
            target: ".data-table-with-search",
            placement: "top",
            title: "Connections between nodes",
            content:
              "The Connections column shows how many partner nodes each of your nodes is linked to. Creating a connection exchanges credentials with the other node, which is what allows the two of you to request and share PCF data.",
            route: NODES_ROUTE,
          },
        ] as ProductTourStep[])
      : []),
    {
      target: '[data-tour="nav-activity-logs"]',
      placement: "right",
      title: "Activity Logs",
      content:
        "Every request made to and from your nodes is recorded here, so you can confirm that an exchange happened and troubleshoot it when it does not.",
    },
    {
      target: '[data-tour="nav-support"]',
      placement: "right",
      title: "That's the tour",
      content:
        "You can replay this tour at any time from here, and the support team is one email away if you get stuck.",
    },
  ];

  return steps;
}
