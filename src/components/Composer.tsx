'use client'

import type { ICardDetails, IState, IUser } from '@/types'
import { Box, Button, Flex, Input, Skeleton, Text } from '@chakra-ui/react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import '@mdxeditor/editor/style.css'
import { updateCard, upload } from '@/utils/update'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
	BlockTypeSelect,
	BoldItalicUnderlineToggles,
	CreateLink,
	ListsToggle,
	MDXEditor,
	type MDXEditorMethods,
	UndoRedo,
	headingsPlugin,
	linkDialogPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	toolbarPlugin,
} from '@mdxeditor/editor'
import Link from 'next/link'
import { ComposerCheckList } from './ComposerCheckList'
import { ComposerComment } from './ComposerComment'
import { ComposerHistory } from './ComposerHistory'
import { useTranslation } from 'next-i18next'

interface IProps {
	data: ICardDetails
	userMap: IUser[]
	id: string
	setHasUnsavedChanges: IState<boolean>
	cardProgressUpdate: (id: string, checkList: number, checkListDone: number) => void
	color: string
	latest: number
}
const interval = 60000
//const interval = 3000
export const Composer = ({ data: initData, id, cardProgressUpdate, color, latest: initLatest, setHasUnsavedChanges, userMap }: IProps) => {
	const { t } = useTranslation('common')
	const [latest, setLatest] = useState(initLatest)
	const ref = React.useRef<MDXEditorMethods>(null)
	const [data, setData] = useState<ICardDetails>(initData)
	const [isUpdating, setIsUpdating] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const [content, setContent] = useState(data.content)
	const [hasNewCardData, setHasNewCardData] = useState(false)
	const fn = async (silent: boolean) => {
		try {
			const res = await fetch(`/api/card/get?id=${id}`)
			const data = await res.json()
			setLatest((c) => {
				setHasNewCardData((d) => (d ? true : data.version !== c))
				return data.version
			})
			if (!silent) {
				setLatest(data.version)
				setData(data.data)
				setContent(data.data.content)
				setHasNewCardData(false)
			}
		} catch {
			console.error('Failed to fetch card')
		}
	}
	const uplaodFn = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files: FileList | null = e.target.files
		setIsUploading(true)
		if (!files || files.length === 0) return
		for (const file of files) {
			const url = await upload(file)
			if (url) {
				const newAttachments = [...data.attachments, { filename: file.name, mime: file.type, url }]
				setData({ ...data, attachments: newAttachments })
				updateCard(id, latest, setLatest, 'addAttachment', { ...data, attachments: newAttachments }, setIsUpdating, false)
				setIsUploading(false)
			}
		}
	}
	useEffect(() => {
		if (!initData) return
		const timer = setInterval(() => {
			fn(true)
		}, interval)
		return () => clearInterval(timer)
	}, [initData])

	return (
		<Box>
			{hasNewCardData && (
				<Flex mb={2} bgColor={`${color}.600`} color="white" align="center" borderRadius={10} p={1} px={5}>
					{t('hasNewData')}
					<Button colorScheme={color} ml={2} size="sm" onClick={() => fn(false)}>
						{t('refresh')}
					</Button>
				</Flex>
			)}
			<Box border="1px solid" borderColor="#eee" borderRadius={5}>
				<MDXEditor
					className="markdownEditor"
					ref={ref}
					readOnly={isUpdating}
					markdown={content}
					plugins={[
						headingsPlugin(),
						listsPlugin(),
						markdownShortcutPlugin(),
						linkPlugin(),
						linkDialogPlugin(),
						toolbarPlugin({
							toolbarClassName: 'toolbar',
							toolbarContents: () => (
								<>
									<UndoRedo />
									<BoldItalicUnderlineToggles />
									<BlockTypeSelect />
									<ListsToggle />
									<CreateLink />
								</>
							),
						}),
					]}
					onChange={(e) => {
						setContent(e)
						setHasUnsavedChanges(true)
					}}
					onBlur={async (e) => {
						await updateCard(id, latest, setLatest, 'content', { ...data, content }, setIsUpdating, false)
						setHasUnsavedChanges(false)
					}}
				/>
			</Box>
			<ComposerCheckList
				id={id}
				latest={latest}
				setLatest={setLatest}
				isUpdating={isUpdating}
				setIsUpdating={setIsUpdating}
				data={data}
				setData={setData}
				color={color}
				cardProgressUpdate={cardProgressUpdate}
			/>
			<Text fontWeight="bold" fontSize={22} my={2}>
				{t('attachFile')}
			</Text>
			{isUploading ? <Skeleton h="40px" /> : <Input type="file" isDisabled={isUpdating} pt={1} m={0} h="40px" onChange={(e) => uplaodFn(e)} />}
			{data.attachments.map((a) => (
				<Box key={a.url} my={5}>
					{a.mime.match(/^image\//) ? (
						<Flex>
							<Image alt={a.url} src={a.url} width={150} height={150} objectFit="cover" />
							<Link target="_blank" passHref href={a.url}>
								<Box ml={2} _hover={{ textDecoration: 'underline' }}>
									{a.filename}
									<ExternalLinkIcon />
								</Box>
							</Link>
						</Flex>
					) : (
						<Link target="_blank" passHref href={a.url}>
							<Box _hover={{ textDecoration: 'underline' }}>
								{a.filename}
								<ExternalLinkIcon />
							</Box>
						</Link>
					)}
				</Box>
			))}
			<ComposerComment latest={latest} setLatest={setLatest} isUpdating={isUpdating} setIsUpdating={setIsUpdating} userList={userMap} id={id} />
			<ComposerHistory userList={userMap} id={id} />
			<style>{`.mdxeditor-popup-container{ z-index:9999; }
            .markdownEditor h1 { font-weight: bold; font-size: 2rem;}
            .markdownEditor h2 { font-weight: bold; font-size: 1.75rem;}
            .markdownEditor h3 { font-weight: bold; font-size: 1.5rem;}
            .markdownEditor h4 { font-weight: bold; font-size: 1.3rem;}
            .markdownEditor h5 { font-weight: bold; font-size: 1.2rem;}
            .markdownEditor h6 { font-weight: bold; font-size: 1rem;}
            .markdownEditor ul, .markdownEditor ol { margin-left: 1rem; }
            .markdownEditor a { color: #4063cf; cursor: pointer; }
            `}</style>
		</Box>
	)
}
