import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import FeedbackWidget from "./FeedbackWidget";
import * as authFetch from "../utils/auth-fetch";

describe("FeedbackWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits feedback with the current route context", async () => {
    vi.spyOn(authFetch, "fetchWithAuth").mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Feedback sent successfully." }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/nodes/12?tab=logs"]}>
        <FeedbackWidget />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    fireEvent.change(screen.getByLabelText("Feedback"), {
      target: { value: "Please make the logs easier to scan." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => {
      expect(authFetch.fetchWithAuth).toHaveBeenCalledWith("/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: "Please make the logs easier to scan.",
          pagePath: "/nodes/12?tab=logs",
          pageTitle: document.title,
        }),
      });
    });

    expect(await screen.findByText("Feedback sent successfully.")).toBeInTheDocument();
  });
});