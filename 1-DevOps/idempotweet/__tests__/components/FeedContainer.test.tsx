import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const originalEnv = process.env;

async function renderContainerWithEnv(enableForm: string, showSeeded: string) {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_ENABLE_IDEM_FORM: enableForm,
    NEXT_PUBLIC_SHOW_SEEDED_IDEMS: showSeeded,
  };

  vi.doMock("@/app/components/IdemForm", () => ({
    IdemForm: () => <div data-testid="idem-form">Mock Form</div>,
  }));

  vi.doMock("@/app/components/IdemsFeed", () => ({
    IdemsFeed: ({ includeSeeded }: { includeSeeded?: boolean }) => (
      <div data-testid="idems-feed">includeSeeded:{String(includeSeeded)}</div>
    ),
  }));

  const { FeedContainer } = await import("@/app/components/FeedContainer");
  render(<FeedContainer />);
}

describe("FeedContainer", () => {
  beforeEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders form when enabled", async () => {
    await renderContainerWithEnv("true", "true");

    expect(screen.getByTestId("idem-form")).toBeInTheDocument();
    expect(screen.getByTestId("idems-feed")).toHaveTextContent("includeSeeded:true");
  });

  it("does not render form when disabled", async () => {
    await renderContainerWithEnv("false", "false");

    expect(screen.queryByTestId("idem-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("idems-feed")).toHaveTextContent("includeSeeded:false");
  });
});
