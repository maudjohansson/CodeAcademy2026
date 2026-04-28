import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IdemForm } from "@/app/components/IdemForm";

function renderWithQueryClient(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <IdemForm />
    </QueryClientProvider>
  );
}

describe("IdemForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("disables submit until author and content have non-whitespace text", () => {
    const queryClient = new QueryClient();
    renderWithQueryClient(queryClient);

    const button = screen.getByRole("button", { name: /Publish Idem/i });
    const authorInput = screen.getByLabelText(/Author/i);
    const contentInput = screen.getByLabelText(/Content/i);

    expect(button).toBeDisabled();

    fireEvent.change(authorInput, { target: { value: "   " } });
    fireEvent.change(contentInput, { target: { value: "hello" } });
    expect(button).toBeDisabled();

    fireEvent.change(authorInput, { target: { value: "Alice" } });
    fireEvent.change(contentInput, { target: { value: "   " } });
    expect(button).toBeDisabled();

    fireEvent.change(contentInput, { target: { value: "Hello world" } });
    expect(button).toBeEnabled();
  });

  it("submits successfully, resets fields, and invalidates idems query", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, id: "idem-123" }),
    } as Response);

    renderWithQueryClient(queryClient);

    const authorInput = screen.getByLabelText(/Author/i) as HTMLInputElement;
    const contentInput = screen.getByLabelText(/Content/i) as HTMLTextAreaElement;

    fireEvent.change(authorInput, { target: { value: "  Alice  " } });
    fireEvent.change(contentInput, { target: { value: "  Hello queue  " } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Idem/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/publish",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ author: "Alice", content: "Hello queue" }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Idem published!/i)).toBeInTheDocument();
    });

    expect(authorInput.value).toBe("");
    expect(contentInput.value).toBe("");

    await waitFor(
      () => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["idems"] });
      },
      { timeout: 2000 }
    );
  });

  it("shows server error message when publish fails", async () => {
    const queryClient = new QueryClient();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Bad request" }),
    } as Response);

    renderWithQueryClient(queryClient);

    fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Idem/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bad request/i)).toBeInTheDocument();
    });
  });

  it("shows fallback error when response has no message", async () => {
    const queryClient = new QueryClient();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    renderWithQueryClient(queryClient);

    fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Idem/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to publish idem/i)).toBeInTheDocument();
    });
  });

  it("shows network error when request throws", async () => {
    const queryClient = new QueryClient();
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    renderWithQueryClient(queryClient);

    fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Idem/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});
