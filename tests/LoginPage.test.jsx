import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { login } from "../src/firebase";
import LoginPage from "../src/components/LoginPage";

vi.mock("../src/firebase");

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    renderWithRouter();
    expect(screen.getByRole("heading", { name: "WebKit Wallpaper" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("calls login and navigates home on success", async () => {
    login.mockResolvedValue({ uid: "user-1" });
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("user@example.com", "secret123"));
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("shows a friendly message when login fails", async () => {
    login.mockRejectedValue({ code: "auth/invalid-credential" });
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Email"), "bad@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });

  it("disables the button while signing in", async () => {
    let resolveLogin;
    login.mockReturnValue(new Promise((res) => { resolveLogin = res; }));
    renderWithRouter();

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();

    resolveLogin({});
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });
});