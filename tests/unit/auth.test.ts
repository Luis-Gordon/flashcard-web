import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/auth";
import type { Session, User, AuthError } from "@supabase/supabase-js";

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      signInWithPassword: (params: unknown) => mockSignInWithPassword(params),
      signUp: (params: unknown) => mockSignUp(params),
      signOut: () => mockSignOut(),
      updateUser: (params: unknown) => mockUpdateUser(params),
    },
  },
}));

const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  created_at: "2024-01-01",
  app_metadata: {},
  user_metadata: {},
} as User;

const mockSession: Session = {
  access_token: "test-token",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
};

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      session: null,
      user: null,
      isLoading: true,
    });
  });

  it("starts in loading state", () => {
    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });

  it("initializes with existing session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    useAuthStore.getState().initialize();

    // Wait for async getSession
    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    const state = useAuthStore.getState();
    expect(state.session).toEqual(mockSession);
    expect(state.user).toEqual(mockUser);
  });

  it("initializes with no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    useAuthStore.getState().initialize();

    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });

  it("handles sign in success", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const { error } = await useAuthStore
      .getState()
      .signIn("test@example.com", "password123");

    expect(error).toBeNull();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("handles sign in error", async () => {
    const authError = {
      message: "Invalid login credentials",
      status: 400,
    } as AuthError;
    mockSignInWithPassword.mockResolvedValue({ error: authError });

    const { error } = await useAuthStore
      .getState()
      .signIn("test@example.com", "wrong-password");

    expect(error).toEqual(authError);
  });

  it("handles sign up success", async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { error } = await useAuthStore
      .getState()
      .signUp("new@example.com", "password123");

    expect(error).toBeNull();
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
    });
  });

  it("handles sign out", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await useAuthStore.getState().signOut();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("cleans up previous auth listener on re-initialize", async () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange
      .mockReturnValueOnce({
        data: { subscription: { unsubscribe: firstUnsubscribe } },
      })
      .mockReturnValueOnce({
        data: { subscription: { unsubscribe: secondUnsubscribe } },
      });

    // First init
    useAuthStore.getState().initialize();
    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
    expect(firstUnsubscribe).not.toHaveBeenCalled();

    // Reset loading to detect second init completing
    useAuthStore.setState({ isLoading: true });

    // Second init should clean up the first listener
    useAuthStore.getState().initialize();
    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    expect(firstUnsubscribe).toHaveBeenCalledOnce();
    expect(secondUnsubscribe).not.toHaveBeenCalled();
  });

  it("updates state on auth state change", async () => {
    let authCallback: (event: string, session: Session | null) => void;

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    useAuthStore.getState().initialize();

    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    // Simulate login event
    authCallback!("SIGNED_IN", mockSession);

    const state = useAuthStore.getState();
    expect(state.session).toEqual(mockSession);
    expect(state.user).toEqual(mockUser);

    // Simulate logout event
    authCallback!("SIGNED_OUT", null);

    const loggedOutState = useAuthStore.getState();
    expect(loggedOutState.session).toBeNull();
    expect(loggedOutState.user).toBeNull();
  });

  it("handles updatePassword success", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    const { error } = await useAuthStore
      .getState()
      .updatePassword("newSecurePassword123");

    expect(error).toBeNull();
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: "newSecurePassword123",
    });
  });

  it("handles updatePassword error", async () => {
    const authError = {
      message: "Password too weak",
      status: 422,
    } as AuthError;
    mockUpdateUser.mockResolvedValue({ error: authError });

    const { error } = await useAuthStore
      .getState()
      .updatePassword("weak");

    expect(error).toEqual(authError);
  });
});
