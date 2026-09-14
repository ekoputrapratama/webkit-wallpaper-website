import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { register } from "../src/firebase";
import RegisterPage from "../src/components/RegisterPage";

vi.mock("../src/firebase", () => ({
  register: vi.fn(),
}));

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the registration form", () => {
    renderWithRouter();
    expect(screen.getByRole("heading", { name: "WebKit Wallpaper" })).toBeInTheDocument();
    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("registers a user and navigates home on success", async () => {
    register.mockResolvedValue({ uid: "user-1" });
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Display Name"), "Jane Doe");
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("jane@example.com", "secret123", "Jane Doe")
    );
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("shows an error when passwords do not match", async () => {
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Display Name"), "Jane Doe");
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "different");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows an error when the password is too short", async () => {
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Display Name"), "Jane Doe");
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByText("Password must be at least 6 characters.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows a friendly message when registration fails", async () => {
    register.mockRejectedValue({ code: "auth/email-already-in-use" });
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Display Name"), "Jane Doe");
    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText("An account with this email already exists.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });
});