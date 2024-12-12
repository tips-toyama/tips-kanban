'use client'

import type { IComment, IHistory, IState, IUser } from '@/types'
import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import '@mdxeditor/editor/style.css'
import { findUser } from '@/utils/search'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ja'
import { useTranslation } from 'next-i18next'
dayjs.extend(relativeTime)

interface IProps {
    id: string
    userList: IUser[]
}
//const interval = 3000000
const interval = 60000

export const ComposerHistory = ({ id, userList }: IProps) => {
    const [histories, setHistories] = useState<IHistory[]>([])
	const { t } = useTranslation('common')
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
                {t('history')}
            </Text>}
            {histories.map((c) => (
                <Flex key={c.id}>
                    <Box w="100%">
                        <Flex w="100%">
                            <Text>{t('historyBase', { name: findUser(userList, c.owner)?.name, action: t(`action.${c.action}`)})}</Text>
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
