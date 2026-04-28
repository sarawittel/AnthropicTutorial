import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth — initial state", () => {
  test("isLoading starts false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("useAuth — signIn", () => {
  test("sets isLoading true while in-flight and false after", async () => {
    let resolveAction!: (v: any) => void;
    vi.mocked(signInAction).mockReturnValue(
      new Promise((r) => (resolveAction = r))
    );
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "p1" } as any);

    const { result } = renderHook(() => useAuth());

    let signInPromise: Promise<any>;
    act(() => {
      signInPromise = result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveAction({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the action result on success", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("returns the action result on failure without navigating", async () => {
    vi.mocked(signInAction).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });
    vi.mocked(getAnonWorkData).mockReturnValue(null);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading to false even when the action throws", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — signUp", () => {
  test("returns success result and navigates", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p99" }] as any);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
    expect(mockPush).toHaveBeenCalledWith("/p99");
  });

  test("returns failure result without navigating", async () => {
    vi.mocked(signUpAction).mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("taken@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading to false even when the action throws", async () => {
    vi.mocked(signUpAction).mockRejectedValue(new Error("server error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("user@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — post-sign-in navigation", () => {
  test("saves anon work as a new project and navigates to it", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/App.tsx": { type: "file", content: "export default () => null" } },
    };
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
    vi.mocked(createProject).mockResolvedValue({ id: "anon-project" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("skips anon-work path when messages array is empty", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
    vi.mocked(getProjects).mockResolvedValue([{ id: "existing" }] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing");
  });

  test("navigates to most recent existing project when no anon work", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "recent" },
      { id: "older" },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a new project and navigates when user has no projects", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "brand-new" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });
});