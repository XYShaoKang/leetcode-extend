import { FC, useEffect, useState } from 'react'

import { withPage } from '@/hoc'
import { useAppSelector } from '@/hooks'

import { selectOptions } from '../global/optionsSlice'
import { Portal } from '@/components/Portal'
import { findElement, findAllElement } from '@/utils'
import Item from './Item'
import Title from './Title'
import { LanguageIconRow } from './LanguageIcon'

const App: FC = () => {
  const options = useAppSelector(selectOptions)
  const [titleRoot, setTitleRoot] = useState<HTMLElement>()
  const [rows, setRows] = useState<HTMLElement[]>()
  useEffect(() => {
    let isMount = true
    void (async function () {
      const parent = await findElement('.table-responsive>table>thead>tr')
      const trs = await findAllElement('.table-responsive>table>tbody>tr')
      if (isMount) {
        setTitleRoot(parent)
        setRows([...trs])
      }
    })()
    return () => {
      isMount = false
    }
  }, [])

  const hasMyRank = rows?.[0]?.className === 'success' ? true : false
  const showPredictor = !!options?.contestRankingPage.ratingPredictor
  const showLanguageIcon = !!options?.contestRankingPage.languageIcon

  return (
    <>
      {showPredictor && titleRoot && (
        <Portal container={titleRoot}>
          <th>
            <Title />
          </th>
        </Portal>
      )}
      {showPredictor &&
        rows?.map((row, i) => (
          <Portal container={row} key={i}>
            <td>
              <Item row={i} hasMyRank={hasMyRank} />
            </td>
          </Portal>
        ))}
      {showLanguageIcon &&
        rows?.map((row, i) => (
          <LanguageIconRow key={i} row={row} i={i} hasMyRank={hasMyRank} />
        ))}
    </>
  )
}

export default withPage('contestRankingPage')(App)
