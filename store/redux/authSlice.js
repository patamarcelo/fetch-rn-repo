import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { LINK } from '../../utils/api';

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

export const exportPdf = createAsyncThunk(
    'export/pdf',
    async (safraCiclo, thunkAPI) => {
        try {
            const res = await fetch(
                `${LINK}/plantio/get_plot_mapa_data_fetchrn_app/`,
                {
                    method: 'POST',
                    body: JSON.stringify(safraCiclo),    // <– recebe o mesmo objeto que você despacha
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    },
                }
            );

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Erro desconhecido');
            }

            const data = await res.json();
            console.log('data here:', data)
            return data;                             // vai para exportPdf.fulfilled
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
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
        status: 'idle',        // 'idle' | 'pending' | 'succeeded' | 'failed'
        dataPlotMap: [],
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
        resetExportState: (state) => {
            state.status = 'idle';
            state.error = null;
            state.dataPlotMap = [];
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
                state.loading = false,
                    state.error = null,
                    state.passwordRecoveryMessage = null,
                    state.success = null
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
            })
            .addCase(exportPdf.pending, (s) => { s.status = 'pending'; })
            .addCase(exportPdf.fulfilled, (s, a) => {
                s.status = 'succeeded';
                s.dataPlotMap = a.payload;        // ← guarda tudo
            })
            .addCase(exportPdf.rejected, (s, a) => {
                s.status = 'failed';
                s.error = a.payload;
            });
    },
});

export const selectExportStatus = (state) => state.auth.status;      // se ainda estiver no authSlice
export const selectExportError = (state) => state.auth.error;

export const { setUser, clearRecoveryMessage, clearError , resetExportState} = authSlice.actions;
export default authSlice.reducer;