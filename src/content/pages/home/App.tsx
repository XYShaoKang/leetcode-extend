import { FC, useEffect, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import DistortSvg from '@/components/DistortSvg'
import { withPage } from '@/hoc'
import { useAppSelector } from '@/hooks'

import GlobalStyle from './GlobalStyle'
import BlockUser from './BlockUser'
import { selectOptions } from '../global/optionsSlice'
import { css } from 'styled-components/macro'
import { useBlock } from './useBlock'
import { findElement } from '@/utils'
import { Portal } from '@/components/Portal'

const App: FC = () => {
  useBlock()
  const options = useAppSelector(selectOptions)
  const [root, setRoot] = useState<HTMLElement>()

  useEffect(() => {
    let isMount = true,
      unmount: () => void
    void (async function () {
      const parent = await findElement('.css-kktm6n-RightContainer')
      const root = document.createElement('div')
      if (isMount) {
        parent.prepend(root)
        setRoot(root)
        unmount = () => root.remove()
      }
    })()
    return () => {
      isMount = false
      unmount && unmount()
    }
  }, [])
  if (!root || !options?.homePage.block) return null
  return (
    <Portal container={root}>
      <div
        css={css`
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-bottom: 10px;
        `}
      >
        <DndProvider backend={HTML5Backend}>
          <GlobalStyle />
          <BlockUser />
          <DistortSvg />
        </DndProvider>
      </div>
    </Portal>
  )
}

export default withPage('homePage')(App)
