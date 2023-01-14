import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import { RootState } from '@/app/store'
import {
  LeetCodeApi,
  GlobalData,
  ProblemsetPageProps,
  ProblemRankData,
  getProblemRankData,
} from '@/utils'

const api = new LeetCodeApi(location.origin)

export const fetchGlobalData = createAsyncThunk<
  GlobalData,
  undefined,
  { state: RootState }
>('global/fetchGlobalData', async () => {
  const res = await api.queryGlobalData()
  return res
})

export const fetchProblemsetPageProps = createAsyncThunk<
  ProblemsetPageProps,
  undefined,
  { state: RootState }
>('global/fetchProblemsetPageProps', async () => {
  const res = await api.getProblemsetPageProps()
  return res
})

export const fetchProblemRankData = createAsyncThunk<
  ProblemRankData[],
  undefined,
  { state: RootState }
>('global/fetchProblemRankData', async () => {
  const res = await getProblemRankData()
  return res
})

export const globalDataSlice = createSlice({
  name: 'global',
  initialState: { ProblemRankData: {} } as {
    globalData?: GlobalData
    problemsetPageProps?: ProblemsetPageProps
    ProblemRankData: { [key: string]: ProblemRankData }
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchGlobalData.fulfilled, (state, action) => {
        state.globalData = action.payload
      })
      .addCase(fetchProblemsetPageProps.fulfilled, (state, action) => {
        state.problemsetPageProps = action.payload
      })
      .addCase(fetchProblemRankData.fulfilled, (state, action) => {
        for (const rank of action.payload) {
          state.ProblemRankData[rank.TitleSlug] = rank
        }
      })
  },
})

export const selectIsPremium = (state: RootState): boolean | undefined =>
  state.global.globalData?.userStatus?.isPremium
export const selectIsSignedIn = (state: RootState): boolean | undefined =>
  state.global.globalData?.userStatus?.isSignedIn

export const selectFeaturedLists = (
  state: RootState
): ProblemsetPageProps['featuredLists'] | undefined =>
  state.global.problemsetPageProps?.featuredLists

export const selectProblemRankDataByTitleSlug = (
  state: RootState,
  titleSlug: string
): ProblemRankData | undefined => state.global.ProblemRankData[titleSlug]

export default globalDataSlice.reducer
