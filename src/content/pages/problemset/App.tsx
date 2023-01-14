import { FC, useEffect, useMemo, useState } from 'react'
import { css } from 'styled-components/macro'
import { Portal } from '@/components/Portal'
import Popper from '@/components/PopperUnstyled'
import SvgIcon from '@/components/SvgIcon'
import { withRoot } from '@/hoc'
import { useAppDispatch, useAppSelector, useHover } from '@/hooks'
import { routerTo } from '@/utils'
import { debounce } from 'src/utils'
import { fetchProblemRankData } from '../global/globalSlice'
import {
  disableProblemRating,
  enableProblemRating,
  selectProblemRatingOption,
} from '../global/optionSlice'

import Rank from './Rank'
import RankTitle from './Title'
import RankRange from './RankRange'
import Open, { Pos } from './Open'
import { fetchAllQuestions } from './questionsSlice'
import { OrderBy, parseParams, SORT_KEY, serializationPrams } from './utils'

interface AppProps {
  root: HTMLDivElement
  tableEl: HTMLElement
  width: number
}

/**
 *
 * 当按照 Rank 排序时，使用 Next.js 的路由，跳转到带自定义排序参数的 url，
 * 然后通过拦截请求，返回通过 Rank 排序的数据，
 * 但如果请求是除了自定义排序的参数外，其他参数都相同，则 Next.js 会缓存前一次的数据，
 * 导致没有拦截请求的机会，这时候可以通过每次传入不同的参数，让 Next.js 每次都重新去请求。
 *
 * 这样会有一个问题，因为我们需要通过拦截请求，返回通过 Rank 排序的数据，
 * 如果之后用户取消 Rank 排序，但其他的参数相同时，
 * 则因为缓存的关系，则不会进行请求，而是依然会返回按照 Rank 排序的数据，导致结果错误。
 *
 * 通过测试发现，对于 sorting 的参加，其中包含一个 sortOrder 的属性，
 * 如果这个属性赋值为正整数的话，那么会按照 ASCENDING 去处理，
 * 但如果赋值不同的正整数，Next.js 每次还会重新去获取数据。
 *
 * 利用这个性质，我们每次在 Rank 的参数中，每次将一个递增的正整数赋值给 sortOrder，
 * 这样既能让 Next.js 每次重新去获取数据，也不会造成其他排序的错误。
 *
 * 这时会有另外一个问题，就是如果之前的 sorking 的参数跟当前参数不同时
 * （比如 orderBy 不同，或是 sortOrder 不为 ASCENDING 或正整数时），
 * 则 Next.js 会重定向到对应的参数，这时候可以提前先将 sortOrder 设置为 ASCENDING，
 * 然后在跳转到 Rank 排序，就不会进行重定向了。
 *
 * 最后如果用户直接在地址栏里面输入一个 Rank 排序的 url，这是因为是第一次访问，
 * 则会先被重定向，所以需要进行一些特殊处理。
 *
 * 考虑上面的情况，最后采用一个自定义参数，其中包含排序相关，以及 Rank 范围相关的参数，
 * 而原先的排序参数则来放累加的 id，防止使用自定义排序时，阻止缓存生效。
 * 而且利用这样一个参数，可以非常方便的区分是否需要拦截请求。
 */

const App: FC<AppProps> = ({ root, tableEl, width }) => {
  const titleRow = tableEl.children[0]?.children[0]?.children[0]
  const [rankRangeWrap, setRankRangeWrap] = useState<HTMLDivElement | null>(
    null
  )
  const [rows, setRows] = useState<HTMLDivElement[]>([])
  const dispatch = useAppDispatch()
  const { enable } = useAppSelector(selectProblemRatingOption)
  const [pos, setPos] = useState<Pos>()
  const [bindPopperRef, hoverPopper, popperRef] = useHover(100)
  const [bindRanRangeRef, hoverRankRange, rankRangeRef] = useHover(100)

  const handleDisable = () => {
    const { right, bottom } = popperRef.current!.getBoundingClientRect()
    setPos({
      right: window.innerWidth - right,
      bottom: window.innerHeight - bottom,
    })
    dispatch(disableProblemRating())
    setTimeout(() => {
      // 清理自定义相关的参数
      const params = parseParams()
      if (params.custom) {
        delete params.sorting
        // 如果之前是其他排序，那么需要保留这个排序选项
        if (params.custom.sort && params.custom.sort.orderBy !== 'RANKING') {
          params.sorting = [params.custom.sort]
        }
        delete params.custom
      }
      const url = location.pathname + '?' + serializationPrams(params)
      routerTo(url)
    }, 500)
  }
  const handleEnable = () => {
    dispatch(enableProblemRating())
  }

  useEffect(() => {
    // 管理原来的排序按钮
    if (enable) {
      dispatch(fetchProblemRankData())
      dispatch(fetchAllQuestions())
      root.style.display = 'block'
    } else {
      root.style.display = 'none'
    }
  }, [enable])

  useEffect(() => {
    // 获取当前所有行，用以在行中去渲染题目对应的评分。

    // 最后一页有可能题目比较少，则渲染的行会变少，
    // 当跳转到其他页时，则题目变多，会重新渲染多出来的行，
    // 这时候就需要重新获取所有行。另外改变每页的条数是也会发生这种情况。
    if (enable) {
      const rowgroup = tableEl.children[0]?.children[1]
      if (!rowgroup || !(rowgroup instanceof HTMLDivElement)) return
      const handleRowChange = debounce(() => {
        const rows: HTMLDivElement[] = []
        ;[...(rowgroup.children ?? [])].forEach(
          el => el instanceof HTMLDivElement && rows.push(el)
        )
        setRows(rows)
      }, 500)
      handleRowChange()
      const observer = new MutationObserver(handleRowChange)
      observer.observe(rowgroup, { childList: true })
      return () => observer.disconnect()
    } else {
      setRows([])
    }
  }, [enable, tableEl.children])

  useEffect(() => {
    // 添加「题目评分范围筛选组件」的根结点
    if (enable) {
      const div = document.createElement('div')
      div.setAttribute(
        'style',
        `display: flex;
        justify-content: end;`
      )
      tableEl.parentElement?.before(div)
      setRankRangeWrap(div)
      return () => {
        setRankRangeWrap(null)
      }
    } else {
      setRankRangeWrap(null)
    }
  }, [enable, tableEl.parentElement])

  const otherRoots = useMemo(() => {
    // 获取其他排序选项的结点，用以控制排序
    const otherRoots: { [key in OrderBy]?: HTMLElement } = {}
    if (titleRow) {
      const children = [...titleRow.children].filter(
        el =>
          el && el.textContent && !new Set(['状态', '企业']).has(el.textContent)
      )
      for (let i = 0; i < SORT_KEY.length; i++) {
        const child = children[i]
        if (child instanceof HTMLElement) {
          child.style.padding = '0'
          otherRoots[SORT_KEY[i].key] = child
        }
      }
    }
    return otherRoots
  }, [titleRow])

  return (
    <>
      {enable && titleRow && <RankTitle otherRoots={otherRoots} />}
      {enable && rankRangeWrap && (
        <Portal container={rankRangeWrap}>
          <div
            ref={bindRanRangeRef}
            css={css`
              display: flex;
              align-items: center;
              padding: 10px;
              background-color: ${props =>
                props.theme.mode === 'dark' ? '#303030' : '#f7f8fa'};
              color: ${props =>
                props.theme.mode === 'dark' ? '#eff1f6bf' : '#262626bf'};
              border-radius: 6px;
              border-bottom-right-radius: 0;
            `}
          >
            <RankRange />
          </div>
        </Portal>
      )}
      {(hoverRankRange || hoverPopper) && (
        <Popper
          placement="right"
          anchorEl={rankRangeRef.current}
          ref={bindPopperRef}
        >
          <div
            css={css`
              background-color: ${props =>
                props.theme.mode === 'dark' ? '#303030' : '#f7f8fa'};

              height: 44px;
              display: flex;
              align-items: center;
              padding: 10px 10px 10px 16px;
              margin-left: -6px;
              margin-top: 4px;
              cursor: pointer;
              border-top-right-radius: 6px;
              border-bottom-right-radius: 6px;
            `}
            onClick={handleDisable}
          >
            <SvgIcon>
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
            </SvgIcon>
          </div>
        </Popper>
      )}
      {enable &&
        rows.map((row, i) => (
          <Portal container={row} key={i}>
            <div
              css={css`
                box-sizing: border-box;
                flex: ${width} 0 auto;
                min-width: 0px;
                width: ${width}px;
                margin: 0 8px;
                padding: 11px 0;
              `}
            >
              <Rank row={row as HTMLElement} />
            </div>
          </Portal>
        ))}
      {!enable && (
        <Portal>
          <Open onEnable={handleEnable} pos={pos} />
        </Portal>
      )}
    </>
  )
}

export default withRoot(App)
