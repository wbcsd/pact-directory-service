import React, { useEffect, useId, useState } from "react";
import {
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  ChatBubbleIcon,
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useLocation } from "react-router-dom";
import { fetchWithAuth } from "../utils/auth-fetch";

const FeedbackWidget: React.FC = () => {
  const location = useLocation();
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const currentPage = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const closeTimer = window.setTimeout(() => {
      setOpen(false);
    }, 300);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [successMessage]);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!message.trim()) {
      setErrorMessage("Please add some feedback before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetchWithAuth("/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: message.trim(),
          pagePath: currentPage,
          pageTitle: document.title,
        }),
      });

      if (!response || !response.ok) {
        const errorBody = response ? await response.json().catch(() => null) : null;
        throw new Error(errorBody?.message || "Failed to submit feedback.");
      }

      const data = await response.json();
      setSuccessMessage(data.message || "Feedback sent.");
      setMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit feedback."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="feedback-widget">
        <Button
          size="3"
          color="indigo"
          radius="full"
          className="feedback-widget__button"
          aria-label="Open feedback form"
          onClick={() => setOpen(true)}
        >
          <ChatBubbleIcon />
        </Button>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content maxWidth="560px">
          <Flex justify="between" align="start" mb="4">
            <Flex direction="column" gap="1">
              <Dialog.Title id={titleId} size="4">Share feedback</Dialog.Title>
              <Dialog.Description id={descriptionId} size="2" color="gray">
                Your feedback will be emailed to pact-support@wbcsd.org with the current page context.
              </Dialog.Description>
            </Flex>
            <Dialog.Close>
              <IconButton variant="ghost" color="gray" aria-label="Close feedback dialog">
                <Cross2Icon width={18} height={18} />
              </IconButton>
            </Dialog.Close>
          </Flex>

          <form onSubmit={handleSubmit} aria-labelledby={titleId} aria-describedby={descriptionId}>
            <Flex direction="column" gap="4">
              <div>
                <Text as="label" size="2" weight="medium" htmlFor="feedback-message">
                  Feedback
                </Text>
                <textarea
                  id="feedback-message"
                  className="feedback-widget__textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us what happened, what you expected, or what would make this page better."
                  rows={7}
                  required
                />
              </div>

              {errorMessage && (
                <Callout.Root color="red" variant="surface">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{errorMessage}</Callout.Text>
                </Callout.Root>
              )}

              {successMessage && (
                <Callout.Root color="green" variant="surface">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>{successMessage}</Callout.Text>
                </Callout.Root>
              )}

              <Flex justify="end" gap="3">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Spinner size="1" />}
                  {submitting ? "Sending…" : "Submit Feedback"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default FeedbackWidget;