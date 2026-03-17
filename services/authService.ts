/**
 * Supabase Authentication Service
 * Handles OAuth (Google/GitHub) and email magic link authentication
 */

import { createClient, User, Session } from '@supabase/supabase-js';

// Environment variables - these should be set in .env.local
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<void> => {
    if (!supabase) {
        throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        },
    });

    if (error) throw error;
};

/**
 * Sign in with GitHub OAuth
 */
export const signInWithGitHub = async (): Promise<void> => {
    if (!supabase) {
        throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin,
        },
    });

    if (error) throw error;
};

/**
 * Sign in with email magic link
 */
export const signInWithEmail = async (email: string): Promise<void> => {
    if (!supabase) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin,
        },
    });

    if (error) throw error;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

/**
 * Get current session
 */
export const getSession = async (): Promise<Session | null> => {
    if (!supabase) return null;

    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

/**
 * Get current user
 */
export const getUser = async (): Promise<User | null> => {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (
    callback: (event: string, session: Session | null) => void
): (() => void) => {
    if (!supabase) {
        return () => { };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
};

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean => {
    return !!supabase;
};
