'use client'

import type { IComment, IHistory, IState, IUser } from '@/types'
import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import '@mdxeditor/editor/style.css'
import { findUser } from '@/utils/search'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ja'
dayjs.extend(relativeTime)

interface IProps {
    id: string
    userList: IUser[]
}
//const interval = 3000000
const interval = 60000

const actionJa = {
    changeContent: 'テキストを変更しました',
    cardTitleUpdate: 'カード名を変更しました',
    delete: 'カードを削除しました',
    add: 'このカードを追加しました',
    move: 'このカラムに移動させました',
    changeCheckList: 'チェックリストを変更しました',
    doCheckList: 'チェックリストを完了/解除しました',
    changeColumnTitle: 'カラム名を変更しました',
    moveColumn: '列を移動させました',
    addColumn: '列を追加しました',
    content: 'テキストを変更しました',
    addAttachment: '添付ファイルを追加しました',
    copy: '複製しました',
}
export const ComposerHistory = ({ id, userList }: IProps) => {
    const [histories, setHistories] = useState<IHistory[]>([])
    const fetchHistories = async () => {
        const res = await fetch(`/api/history?id=${id}`)
        const data = await res.json()
        setHistories(data.length ? data : [])
    }
    useEffect(() => {
        fetchHistories()
        const timer = setInterval(() => {
            fetchHistories()
        }, interval)
        return () => clearInterval(timer)
    }, [id])
    return (
        <Box>
            {histories.length > 0 && <Text fontWeight="bold" fontSize={22} my={2}>
                操作履歴
            </Text>}
            {histories.map((c) => (
                <Flex key={c.id}>
                    <Box w="100%">
                        <Flex w="100%">
                            <Text>{findUser(userList, c.owner)?.name}さんが{actionJa[c.action]}。</Text>
                            <Text fontSize={14} color="gray.500">
                                {dayjs(c.createdAtUnix * 1000).locale('ja').fromNow()}({dayjs(c.createdAtUnix * 1000).format('YYYY/MM/DD HH:mm')})
                            </Text>
                        </Flex>
                    </Box>
                </Flex>
            ))}
        </Box>
    )
}
