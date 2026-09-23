import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { submitTheme, getProfile, fetchThemeById, updateTheme } from "../src/firebase";
import ThemeForm from "../src/components/ThemeForm";

vi.mock("../src/firebase", () => ({
  submitTheme: vi.fn(),
  getProfile: vi.fn(),
  fetchThemeById: vi.fn(),
  updateTheme: vi.fn(),
}));

const testUser = {
  uid: "owner-1",
  displayName: "Jane Doe",
  email: "jane@example.com",
};

function makeZip(name = "theme.zip") {
  return new File(["zip-contents"], name, { type: "application/zip" });
}

async function fillBasicForm() {
  await userEvent.type(screen.getByLabelText("Name *"), "Sunset Shader");
  await userEvent.type(screen.getByLabelText("Description"), "A beautiful animated gradient theme.");
  const zip = makeZip();
  await userEvent.upload(screen.getByLabelText(/Wallpaper \.zip/), zip);
  return zip;
}

describe("ThemeForm — submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue({ id: testUser.uid, displayName: "Jane Doe" });
    submitTheme.mockResolvedValue("theme-123");
  });

  it('renders the "Submit New Theme" form and loads the author profile', async () => {
    render(<ThemeForm user={testUser} onSubmitted={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Submit New Theme" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Author")).toHaveValue("Jane Doe");
  });

  it("submits a new theme with the expected data", async () => {
    const onSubmitted = vi.fn();
    render(<ThemeForm user={testUser} onSubmitted={onSubmitted} />);

    await fillBasicForm();
    await userEvent.type(screen.getByLabelText("Tags"), "shader, animated, dark");
    await userEvent.type(screen.getByLabelText("Donation URL"), "https://ko-fi.com/jane");
    await userEvent.click(screen.getByRole("button", { name: "Submit Theme" }));

    await waitFor(() =>
      expect(submitTheme).toHaveBeenCalledWith(
        {
          name: "Sunset Shader",
          description: "A beautiful animated gradient theme.",
          tags: ["shader", "animated", "dark"],
          donationUrl: "https://ko-fi.com/jane",
          author: "Jane Doe",
        },
        {
          thumbnailFile: null,
          wallpaperFile: expect.any(File),
          uid: "owner-1",
        }
      )
    );

    expect(await screen.findByText("Theme submitted successfully!")).toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("does not submit if the name is missing", async () => {
    render(<ThemeForm user={testUser} onSubmitted={vi.fn()} />);

    const zip = makeZip();
    await userEvent.upload(screen.getByLabelText(/Wallpaper \.zip/), zip);
    await userEvent.click(screen.getByRole("button", { name: "Submit Theme" }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(submitTheme).not.toHaveBeenCalled();
  });

  it("does not submit if no wallpaper zip is selected", async () => {
    render(<ThemeForm user={testUser} onSubmitted={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name *"), "Sunset Shader");
    await userEvent.click(screen.getByRole("button", { name: "Submit Theme" }));

    expect(screen.getByText("Please select a wallpaper .zip file.")).toBeInTheDocument();
    expect(submitTheme).not.toHaveBeenCalled();
  });

  it("rejects a non-image thumbnail file", async () => {
    render(<ThemeForm user={testUser} onSubmitted={vi.fn()} />);

    const textFile = new File(["txt"], "notes.txt", { type: "text/plain" });
    await userEvent.upload(screen.getByLabelText("Thumbnail Image"), textFile, { applyAccept: false });

    expect(screen.getByText("Thumbnail must be an image file.")).toBeInTheDocument();
  });

  it("shows an error if submission fails", async () => {
    submitTheme.mockRejectedValue(new Error("upload failed"));
    render(<ThemeForm user={testUser} onSubmitted={vi.fn()} />);

    await fillBasicForm();
    await userEvent.click(screen.getByRole("button", { name: "Submit Theme" }));

    expect(await screen.findByText("Error: upload failed")).toBeInTheDocument();
  });
});

describe("ThemeForm — update", () => {
  const themeId = "theme-123";
  const existingTheme = {
    id: themeId,
    name: "Sunset Shader",
    description: "Old description.",
    tags: ["shader", "animated"],
    donation_url: "https://ko-fi.com/jane",
    donation_label: "Support me",
    thumbnail_url: "https://example.com/thumb.png",
    wallpaper_url: "https://example.com/wallpaper.zip",
    uid: "owner-1",
    type: "theme",
    downloads: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue({ id: testUser.uid, displayName: "Jane Doe" });
    fetchThemeById.mockResolvedValue(existingTheme);
    updateTheme.mockResolvedValue(themeId);
  });

  it("loads the existing theme into the edit form", async () => {
    render(<ThemeForm user={testUser} themeId={themeId} onSubmitted={vi.fn()} />);

    expect(screen.getByText("Loading theme data...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Edit Theme" })).toBeInTheDocument();

    expect(screen.getByLabelText("Name *")).toHaveValue("Sunset Shader");
    expect(screen.getByLabelText("Description")).toHaveValue("Old description.");
    expect(screen.getByLabelText("Tags")).toHaveValue("shader, animated");
    expect(screen.getByText("Current file will be kept.")).toBeInTheDocument();
    expect(screen.getByAltText("Preview")).toBeInTheDocument();
  });

  it("updates the theme with edited fields", async () => {
    const onSubmitted = vi.fn();
    render(<ThemeForm user={testUser} themeId={themeId} onSubmitted={onSubmitted} />);
    await screen.findByRole("heading", { name: "Edit Theme" });

    await userEvent.clear(screen.getByLabelText("Name *"));
    await userEvent.type(screen.getByLabelText("Name *"), "Midnight Shader");
    await userEvent.click(screen.getByRole("button", { name: "Update Theme" }));

    await waitFor(() =>
      expect(updateTheme).toHaveBeenCalledWith(
        themeId,
        {
          name: "Midnight Shader",
          description: "Old description.",
          tags: ["shader", "animated"],
          donationUrl: "https://ko-fi.com/jane",
          author: "Jane Doe",
        },
        {
          thumbnailFile: null,
          wallpaperFile: null,
          uid: "owner-1",
          existingThumbnail: "https://example.com/thumb.png",
          existingWallpaper: "https://example.com/wallpaper.zip",
        }
      )
    );

    expect(await screen.findByText("Theme updated successfully!")).toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("keeps existing files when none are selected on edit", async () => {
    render(<ThemeForm user={testUser} themeId={themeId} onSubmitted={vi.fn()} />);
    await screen.findByRole("heading", { name: "Edit Theme" });

    await userEvent.click(screen.getByRole("button", { name: "Update Theme" }));

    await waitFor(() =>
      expect(updateTheme).toHaveBeenCalledWith(
        themeId,
        expect.objectContaining({ name: "Sunset Shader" }),
        expect.objectContaining({
          thumbnailFile: null,
          wallpaperFile: null,
          existingThumbnail: "https://example.com/thumb.png",
          existingWallpaper: "https://example.com/wallpaper.zip",
        })
      )
    );
  });

  it("blocks editing a theme owned by another user", async () => {
    fetchThemeById.mockResolvedValue({ ...existingTheme, uid: "someone-else" });
    render(<ThemeForm user={testUser} themeId={themeId} onSubmitted={vi.fn()} />);

    expect(
      await screen.findByText("You can only edit your own themes.")
    ).toBeInTheDocument();
    expect(updateTheme).not.toHaveBeenCalled();
  });

  it("shows an error when the theme cannot be loaded", async () => {
    fetchThemeById.mockRejectedValue(new Error("network down"));
    render(<ThemeForm user={testUser} themeId={themeId} onSubmitted={vi.fn()} />);

    expect(await screen.findByText("Error loading theme: network down")).toBeInTheDocument();
  });
});