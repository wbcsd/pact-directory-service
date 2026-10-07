import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Joyride, {
  ACTIONS,
  EVENTS,
  STATUS,
  type CallBackProps,
  type Styles,
} from "react-joyride";
import { useAuth } from "./AuthContext";
import TourWelcomeDialog from "../components/TourWelcomeDialog";
import { buildProductTourSteps } from "../utils/tour-steps";
import { hasSeenProductTour, markProductTourSeen } from "../utils/tour-storage";

interface TourContextType {
  isRunning: boolean;
  startTour: () => void;
}

const TourContext = createContext<TourContextType>({
  isRunning: false,
  startTour: () => {},
});

export const useTour = () => useContext(TourContext);

/** Routes without the app shell — the tour has nothing to point at there. */
const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/set-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

const isPublicRoute = (pathname: string): boolean =>
  pathname === "/" || PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

/** How long to wait for a step's target to render after a route change. */
const TARGET_WAIT_MS = 4000;
const TARGET_POLL_MS = 100;

const joyrideStyles: Partial<Styles> = {
  options: {
    primaryColor: "#09094e",
    textColor: "#1c1c2e",
    backgroundColor: "#ffffff",
    arrowColor: "#ffffff",
    overlayColor: "rgba(9, 9, 78, 0.55)",
    zIndex: 10000,
  },
  tooltip: { borderRadius: 8, padding: 20 },
  tooltipTitle: { fontSize: 18, fontWeight: 600, textAlign: "left", margin: 0 },
  tooltipContent: { fontSize: 14, lineHeight: 1.55, textAlign: "left", padding: "12px 0 0" },
  buttonNext: { borderRadius: 6, fontSize: 14, padding: "8px 16px" },
  buttonBack: { color: "#09094e", fontSize: 14, marginRight: 8 },
  buttonSkip: { color: "#6b7280", fontSize: 14 },
};

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, profileData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [promptOpen, setPromptOpen] = useState(false);
  // The user the prompt has already been offered to this app load. Postponing
  // leaves the stored flag unset, so the next load offers it again.
  const [offeredTo, setOfferedTo] = useState<number | null>(null);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  const steps = useMemo(
    () => buildProductTourSteps(profileData?.policies ?? []),
    [profileData?.policies]
  );

  // goToStep compares against the live path without re-creating on every navigation.
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const endTour = useCallback(
    (markSeen: boolean) => {
      setRun(false);
      setPendingTarget(null);
      setStepIndex(0);
      setPromptOpen(false);
      if (markSeen && profileData) {
        markProductTourSeen(profileData.id);
      }
    },
    [profileData]
  );

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= steps.length) {
        endTour(true);
        return;
      }

      const step = steps[nextIndex];
      setStepIndex(nextIndex);

      if (step.route && step.route !== pathnameRef.current) {
        // Pause while the destination page mounts; the poll below resumes us.
        setRun(false);
        navigate(step.route);
        setPendingTarget(String(step.target));
      }
    },
    [steps, endTour, navigate]
  );

  const startTour = useCallback(() => {
    if (steps.length === 0) return;
    setPromptOpen(false);
    setStepIndex(0);

    const first = steps[0];
    if (first.route && first.route !== pathnameRef.current) {
      setRun(false);
      navigate(first.route);
      setPendingTarget(String(first.target));
    } else {
      setRun(true);
    }
  }, [steps, navigate]);

  // Resume the tour once the step's target exists in the DOM.
  useEffect(() => {
    if (!pendingTarget) return;

    let timer = 0;
    const deadline = Date.now() + TARGET_WAIT_MS;

    const poll = () => {
      // Give up after the deadline and let Joyride report TARGET_NOT_FOUND,
      // which advances the tour past the missing step.
      if (document.querySelector(pendingTarget) || Date.now() > deadline) {
        setPendingTarget(null);
        setRun(true);
        return;
      }
      timer = window.setTimeout(poll, TARGET_POLL_MS);
    };

    timer = window.setTimeout(poll, TARGET_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [pendingTarget]);

  // Offer the tour once per user, on the first authenticated page they land on.
  useEffect(() => {
    if (!isAuthenticated || !profileData) return;
    if (offeredTo === profileData.id) return;
    if (isPublicRoute(location.pathname)) return;
    if (hasSeenProductTour(profileData.id)) return;
    setOfferedTo(profileData.id);
    setPromptOpen(true);
  }, [offeredTo, isAuthenticated, profileData, location.pathname]);

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        endTour(true);
        return;
      }

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        goToStep(index + (action === ACTIONS.PREV ? -1 : 1));
      }
    },
    [endTour, goToStep]
  );

  const contextValue = useMemo(
    () => ({ isRunning: run || pendingTarget !== null, startTour }),
    [run, pendingTarget, startTour]
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <TourWelcomeDialog
        open={promptOpen}
        userName={profileData?.fullName}
        onAccept={startTour}
        onPostpone={() => setPromptOpen(false)}
        onDecline={() => endTour(true)}
      />
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        continuous
        showProgress
        showSkipButton
        hideCloseButton
        disableOverlayClose
        scrollToFirstStep
        styles={joyrideStyles}
        locale={{
          back: "Back",
          close: "Close",
          last: "Finish",
          next: "Next",
          skip: "Close tour",
        }}
      />
    </TourContext.Provider>
  );
};
