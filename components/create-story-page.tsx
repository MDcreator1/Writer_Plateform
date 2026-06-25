"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CustomSelect } from "@/components/custom-select";
import { useSearchParams } from "next/navigation";

const DRAFT_STORAGE_KEY = "velora_story_studio_draft";
const MIN_TAGS = 2;
const MAX_TAGS = 5;
const TAG_LIBRARY = [
  "Fantasy",
  "Romance",
  "Mystery",
  "History",
  "Fiction",
  "Thriller",
  "Adventure",
  "Magic",
  "Royal",
  "War",
  "Friendship",
  "Dark",
  "Comedy",
  "Action",
  "Drama",
  "Poetry",
  "Slice of Life",
  "Mythology",
  "Sci-Fi",
  "Horror"
];

type StoryStudioForm = {
  storyTitle: string;
  genre: string;
  language: string;
  storyType: string;
  leadingGender: string;
  synopsis: string;
  tagCategory: string;
  tagsText: string;
  abbreviation: string;
  storyLength: string;
  writingContest: string;
  warningNotice: string;
  invitationCode: string;
  coverDataUrl: string;
  draftId: string;
  projectId: string;
};

const initialForm: StoryStudioForm = {
  storyTitle: "",
  genre: "",
  language: "english",
  storyType: "novel",
  leadingGender: "",
  synopsis: "",
  tagCategory: "",
  tagsText: "",
  abbreviation: "",
  storyLength: "",
  writingContest: "",
  warningNotice: "",
  invitationCode: "",
  coverDataUrl: "",
  draftId: "",
  projectId: ""
};

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTags(tags: string[]) {
  return tags.join(", ");
}

function getCurrentTagQuery(value: string) {
  const pieces = value.split(",");
  return (pieces[pieces.length - 1] || "").trim().toLowerCase();
}

function FieldLabel({ children, count }: { children: React.ReactNode; count?: string }) {
  return (
    <label className="line-label flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
      {count ? <small className="text-danger">{count}</small> : null}
    </label>
  );
}


export function CreateStoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted font-semibold">Loading story studio...</div>}>
      <CreateStoryFormContent />
    </Suspense>
  );
}

function CreateStoryFormContent() {
  const searchParams = useSearchParams();
  const paramStoryId = searchParams.get("storyId") || "";
  const paramProjectId = searchParams.get("projectId") || "";
  const paramTitle = searchParams.get("title") || "";
  const paramAuthor = searchParams.get("author") || "";
  const paramSynopsis = searchParams.get("synopsis") || "";
  const paramLanguage = searchParams.get("language") || "";
  const paramStoryType = searchParams.get("storyType") || "";

  const [form, setForm] = useState<StoryStudioForm>(initialForm);
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);
  const [status, setStatus] = useState("Draft not saved yet");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tags = useMemo(() => parseTags(form.tagsText), [form.tagsText]);
  const tagQuery = getCurrentTagQuery(form.tagsText);
  const selectedTagKeys = useMemo(() => new Set(tags.map((tag) => tag.toLowerCase())), [tags]);
  const tagSuggestions = TAG_LIBRARY.filter((tag) => {
    const lower = tag.toLowerCase();
    if (selectedTagKeys.has(lower)) {
      return false;
    }

    return !tagQuery || lower.includes(tagQuery);
  }).slice(0, 18);

  useEffect(() => {
    if (paramStoryId || paramProjectId || paramTitle) {
      setForm((current) => ({
        ...current,
        draftId: paramStoryId || current.draftId,
        projectId: paramProjectId || current.projectId,
        storyTitle: paramTitle || current.storyTitle,
        synopsis: paramSynopsis || current.synopsis,
        language: paramLanguage === "hi" ? "hindi" : (paramLanguage === "en" ? "english" : current.language),
        storyType: paramStoryType || current.storyType
      }));
      setStatus("Story metadata pre-filled from Writing Studio.");
      return;
    }

    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const draft = JSON.parse(stored) as Partial<StoryStudioForm> & { updatedAt?: string };
      setForm((current) => ({ ...current, ...draft }));
      if (draft.updatedAt) {
        setStatus(`Draft restored (${new Date(draft.updatedAt).toLocaleString()})`);
      }
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [paramStoryId, paramProjectId, paramTitle, paramAuthor, paramSynopsis, paramLanguage, paramStoryType]);

  function updateField<Key extends keyof StoryStudioForm>(key: Key, value: StoryStudioForm[Key]) {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addTag(tag: string) {
    const nextTags = parseTags(form.tagsText);
    const exists = nextTags.some((item) => item.toLowerCase() === tag.toLowerCase());

    if (!exists && nextTags.length < MAX_TAGS) {
      nextTags.push(tag);
    }

    updateField("tagsText", nextTags.length >= MAX_TAGS ? formatTags(nextTags) : `${formatTags(nextTags)}, `);
    setTagSuggestionsOpen(nextTags.length < MAX_TAGS);
  }

  // When publishing (from Studio draft), all fields are required.
  // When saving as unpublished from platform, only title + genre are required.
  function validateForCreate(publishing = false) {
    if (!form.storyTitle.trim()) {
      return "Book name is required.";
    }

    if (!form.genre) {
      return "Please select genre.";
    }

    if (!publishing) {
      // Relaxed: only title and genre needed for unpublished drafts
      return "";
    }

    if (!form.leadingGender) {
      return "Please select leading gender.";
    }

    if (form.synopsis.trim().length < 20) {
      return "Summary should be at least 20 characters.";
    }

    if (tags.length < MIN_TAGS) {
      return `Please add at least ${MIN_TAGS} tags.`;
    }

    if (tags.length > MAX_TAGS) {
      return `You can add up to ${MAX_TAGS} tags only.`;
    }

    return "";
  }

  async function persistStory(published: boolean) {
    const validationError = validateForCreate(published);

    if (validationError) {
      setError(validationError);
      return;
    }

    const storyTitle = form.storyTitle.trim() || "Untitled Draft";
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          storyTitle,
          tags,
          published
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || "Story save failed.");
      }


      // Always redirect to admin after save so draft appears in Unpublished Stories section.
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setStatus(published ? "Story published! Redirecting..." : "Draft saved! Redirecting to admin...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1200);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Story save failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("coverDataUrl", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="create-story-page min-h-screen">
      <header className="lm-topbar">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-on-accent shadow-glow">
              <BookOpen className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-display text-xl font-semibold leading-none text-ink">Story Studio</span>
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
                {form.draftId ? "Publish draft" : "New story"}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="lm-btn-secondary py-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <ThemeSwitcher compact />
          </div>
        </nav>
      </header>

      <section className="new-story-main mx-auto w-full max-w-6xl px-5 py-10">
        <div className="form-shell lm-card p-5 md:p-6">
          <div className="form-title-row flex items-center justify-between gap-4 border-b border-border pb-4">
            <h1 className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-ink">
              {form.draftId ? "Publish Studio Story" : "Information"}
            </h1>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent3">
              <Sparkles className="h-3.5 w-3.5" />
              Admin
            </span>
          </div>

          <form
            id="new_story_form"
            className="new-story-form mt-5 grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              // Studio drafts (with draftId) publish directly; platform-created stories save as unpublished.
              const shouldPublish = Boolean(form.draftId);
              void persistStory(shouldPublish);
            }}
          >
            <div className="top-info-grid grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
              <div className="top-info-fields grid gap-4">
                <div>
                  <FieldLabel count={`${form.storyTitle.length}/70`}>Book Name</FieldLabel>
                  <input
                    id="story_title"
                    name="story_title"
                    type="text"
                    maxLength={70}
                    placeholder="Within 70 characters"
                    required
                    className="lm-input"
                    value={form.storyTitle}
                    onChange={(event) => updateField("storyTitle", event.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Genre</FieldLabel>
                  <CustomSelect
                    value={form.genre}
                    onChange={(val) => updateField("genre", val)}
                    options={[
                      { value: "fantasy", label: "Fantasy" },
                      { value: "romance", label: "Romance" },
                      { value: "mystery", label: "Mystery" },
                      { value: "history", label: "History" },
                      { value: "fiction", label: "Fiction" }
                    ]}
                    placeholder="Select"
                    size="md"
                    triggerClassName="bg-surface border-border hover:border-accent w-full"
                  />
                </div>

                <div>
                  <FieldLabel>Language</FieldLabel>
                  <CustomSelect
                    value={form.language}
                    onChange={(val) => updateField("language", val)}
                    options={[
                      { value: "english", label: "English" },
                      { value: "hindi", label: "Hindi" },
                      { value: "hinglish", label: "Hinglish" }
                    ]}
                    placeholder="Select"
                    size="md"
                    triggerClassName="bg-surface border-border hover:border-accent w-full"
                  />
                </div>

                <div>
                  <FieldLabel>Type</FieldLabel>
                  <div className="option-row flex flex-wrap gap-3 rounded-lg border border-border bg-surface-soft p-3">
                    {["novel", "Story", "Short Story"].map((value) => (
                      <label key={value} className="option inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
                        <input
                          type="radio"
                          name="story_type"
                          value={value}
                          checked={form.storyType === value}
                          onChange={(event) => updateField("storyType", event.target.value)}
                        />
                        {value === "novel" ? "Novel" : value}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Leading Gender</FieldLabel>
                  <div className="option-row flex flex-wrap gap-3 rounded-lg border border-border bg-surface-soft p-3">
                    {[
                      { label: "Male Oriented", value: "male" },
                      { label: "Female Oriented", value: "female" }
                    ].map((item) => (
                      <label key={item.value} className="option inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
                        <input
                          type="radio"
                          name="leading_gender"
                          value={item.value}
                          checked={form.leadingGender === item.value}
                          onChange={(event) => updateField("leadingGender", event.target.value)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cover-block-inline grid gap-3 justify-items-start max-lg:order-first max-lg:justify-items-center">
                <FieldLabel>Book Cover</FieldLabel>
                <div
                  id="cover_preview"
                  className="cover-preview grid aspect-[210/297] w-56 place-items-center overflow-hidden rounded-lg border border-border bg-surface-soft bg-cover bg-center font-display text-5xl text-muted shadow-soft"
                  style={form.coverDataUrl ? { backgroundImage: `url(${form.coverDataUrl})` } : undefined}
                >
                  {form.coverDataUrl ? null : "W"}
                </div>
                <label className="upload-btn inline-flex w-56 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-on-accent shadow-soft transition hover:brightness-105" htmlFor="cover_input">
                  <Upload className="h-4 w-4" />
                  Upload
                </label>
                <input id="cover_input" type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </div>
            </div>

            <div>
              <FieldLabel>Summary</FieldLabel>
              <textarea
                id="synopsis"
                name="synopsis"
                rows={4}
                maxLength={600}
                placeholder="Type something seriously, wonderful synopsis can attract more readers"
                required
                className="lm-input min-h-28 resize-y italic"
                value={form.synopsis}
                onChange={(event) => updateField("synopsis", event.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Tag Category And Tags</FieldLabel>
              <CustomSelect
                value={form.tagCategory}
                onChange={(val) => updateField("tagCategory", val)}
                options={[
                  { value: "", label: "Select category" },
                  { value: "popular", label: "Popular" },
                  { value: "audience", label: "Audience" },
                  { value: "mood", label: "Mood" }
                ]}
                placeholder="Select category"
                size="md"
                triggerClassName="bg-surface border-border hover:border-accent w-full"
              />
            </div>

            <div className="tag-picker relative" id="tag_picker">
              <input
                id="tags"
                name="tags"
                type="text"
                placeholder="Search tags"
                autoComplete="off"
                className="lm-input"
                value={form.tagsText}
                onFocus={() => setTagSuggestionsOpen(tags.length < MAX_TAGS)}
                onClick={() => setTagSuggestionsOpen(tags.length < MAX_TAGS)}
                onChange={(event) => {
                  const nextTags = parseTags(event.target.value).slice(0, MAX_TAGS);
                  updateField("tagsText", event.target.value.endsWith(",") ? `${formatTags(nextTags)}, ` : event.target.value);
                  setTagSuggestionsOpen(nextTags.length < MAX_TAGS);
                }}
              />
              {tagSuggestionsOpen ? (
                <div
                  className="tag-suggestion-panel absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 flex flex-wrap gap-2 rounded-lg border border-border bg-surface-raised p-3 shadow-luxury backdrop-blur-xl"
                  aria-label="Tag suggestions"
                >
                  {tagSuggestions.length ? (
                    tagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="tag-suggestion-item rounded-full border border-border bg-surface-soft px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent hover:bg-accent-soft"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                      </button>
                    ))
                  ) : (
                    <small className="text-muted">The maximum number of tags is complete</small>
                  )}
                </div>
              ) : null}
            </div>

            <div>
              <FieldLabel count={`${form.abbreviation.length}/15`}>Short Name</FieldLabel>
              <input
                id="abbreviation"
                name="abbreviation"
                type="text"
                maxLength={15}
                placeholder="Within 15 characters"
                className="lm-input"
                value={form.abbreviation}
                onChange={(event) => updateField("abbreviation", event.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Length</FieldLabel>
              <CustomSelect
                value={form.storyLength}
                onChange={(val) => updateField("storyLength", val)}
                options={[
                  { value: "", label: "Select" },
                  { value: "short", label: "Short" },
                  { value: "medium", label: "Medium" },
                  { value: "long", label: "Long" }
                ]}
                placeholder="Select"
                size="md"
                triggerClassName="bg-surface border-border hover:border-accent w-full"
              />
            </div>

            <div>
              <FieldLabel>Writing Contest</FieldLabel>
              <CustomSelect
                value={form.writingContest}
                onChange={(val) => updateField("writingContest", val)}
                options={[
                  { value: "", label: "Select" },
                  { value: "none", label: "None" },
                  { value: "monthly", label: "Monthly Contest" }
                ]}
                placeholder="Select"
                size="md"
                triggerClassName="bg-surface border-border hover:border-accent w-full"
              />
            </div>

            <div>
              <FieldLabel>Warning Notice</FieldLabel>
              <CustomSelect
                value={form.warningNotice}
                onChange={(val) => updateField("warningNotice", val)}
                options={[
                  { value: "", label: "Select" },
                  { value: "none", label: "None" },
                  { value: "violence", label: "Violence" },
                  { value: "sensitive", label: "Sensitive content" }
                ]}
                placeholder="Select"
                size="md"
                triggerClassName="bg-surface border-border hover:border-accent w-full"
              />
            </div>

            <div>
              <FieldLabel>Invitation Code</FieldLabel>
              <input
                id="invitation_code"
                name="invitation_code"
                type="text"
                placeholder="Optional"
                className="lm-input"
                value={form.invitationCode}
                onChange={(event) => updateField("invitationCode", event.target.value)}
              />
            </div>

            <div className="meta-row flex flex-wrap justify-between gap-2 text-sm text-muted">
              <small>{form.synopsis.length}/600</small>
              <small>{status}</small>
            </div>

            {error ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <div className="action-row ml-auto flex flex-wrap justify-end gap-3">
              {/* <button
                type="button"
                id="save_draft_btn"
                className="new-story-btn ghost lm-btn-secondary"
                disabled={isSubmitting}
                onClick={() => void persistStory(false)}
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button> */}
              <button type="submit" id="create_story_btn" className="new-story-btn lm-btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (form.draftId ? "Publish Story" : "Save as Draft")}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
