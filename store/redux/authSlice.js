import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

// Thunks
export const login = createAsyncThunk('auth/login', async ({ email, password }, thunkAPI) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.message);
    }
});

export const logout = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
    console.log('logOut')
    try {
        await signOut(auth);
        return null;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.message);
    }
});

export const recoverPassword = createAsyncThunk(
    'auth/recoverPassword',
    async (email, thunkAPI) => {
        console.log('recover')
        try {
            await sendPasswordResetEmail(auth, email);
            return `Email para redefenir a senha enviado para: ${email}`;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.message);
        }
    }
);


const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        passwordRecoveryMessage: null, 
        success: null,
    },
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        },
        clearRecoveryMessage(state) {
            state.passwordRecoveryMessage = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.loading = false;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;
            })
            .addCase(recoverPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = null;
            })
            .addCase(recoverPassword.fulfilled, (state, action) => {
                state.loading = false;
                state.success = action.payload; // Capture success message
                state.error = null
            })
            .addCase(recoverPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.success = null;
            });
    },
});

export const { setUser, clearRecoveryMessage, clearError } = authSlice.actions;
export default authSlice.reducer;