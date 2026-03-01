import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createElement } from "react";
import NotFound from "@/routes/NotFound";

// Mock MarketingLayout — render children directly
vi.mock("@/components/MarketingLayout", () => ({
  MarketingLayout: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "marketing-layout" }, children),
}));

afterEach(cleanup);

function renderNotFound() {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: ["/nonexistent"] },
      createElement(NotFound),
    ),
  );
}

describe("NotFound page", () => {
  test("renders 404 heading", () => {
    renderNotFound();
    expect(screen.getByText("404")).toBeDefined();
  });

  test("renders 'Page not found' subtitle", () => {
    renderNotFound();
    expect(screen.getByText("Page not found")).toBeDefined();
  });

  test("renders wrapped in MarketingLayout", () => {
    renderNotFound();
    expect(screen.getByTestId("marketing-layout")).toBeDefined();
  });

  test("'Go home' links to /", () => {
    renderNotFound();
    const link = screen.getByRole("link", { name: /go home/i });
    expect(link.getAttribute("href")).toBe("/");
  });

  test("'Go to app' links to /app", () => {
    renderNotFound();
    const link = screen.getByRole("link", { name: /go to app/i });
    expect(link.getAttribute("href")).toBe("/app");
  });
});
