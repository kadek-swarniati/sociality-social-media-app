import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ProfileTab =
  | 'posts'
  | 'likes'
  | 'saved'
  | 'followers'
  | 'following';

interface UiState {
  isCreatePostOpen: boolean;
  isMobileMenuOpen: boolean;
  activeProfileTab: ProfileTab;
}

const initialState: UiState = {
  isCreatePostOpen: false,
  isMobileMenuOpen: false,
  activeProfileTab: 'posts',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCreatePostOpen(state, action: PayloadAction<boolean>) {
      state.isCreatePostOpen = action.payload;
    },
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.isMobileMenuOpen = action.payload;
    },
    setActiveProfileTab(state, action: PayloadAction<ProfileTab>) {
      state.activeProfileTab = action.payload;
    },
  },
});

export const { setCreatePostOpen, setMobileMenuOpen, setActiveProfileTab } =
  uiSlice.actions;

export default uiSlice.reducer;
