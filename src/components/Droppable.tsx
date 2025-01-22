import type { IEditor } from '@/types'
import { Box, Skeleton } from '@chakra-ui/react'
import { useState } from 'react'
interface IProps {
	index: number
	target: string
	editor: IEditor
	final?: boolean
}
const Droppable = ({ index, target, editor, final }: IProps) => {
	const [inDrag, setInDrag] = useState(false)
	const onDragOver = (e: any) => {
		e.preventDefault()
		setInDrag(true)
	}
	const onDrop = (e: any) => {
		e.preventDefault()
		editor.move(target, index - 1)
		setInDrag(false)
	}
	if (index === 0) {
		return (
			<>
				<Box h="8px" w="100%" />
				<Box
					transition="background-color 0.2s ease"
					h={inDrag ? '32px' : '8px'}
					top={inDrag ? '-16px' : '-8px'}
					w="100%"
					position="absolute"
					backgroundColor={inDrag ? 'blue.300' : ''}
					onDragOver={onDragOver}
					onDragLeave={() => setInDrag(false)}
					onDrop={onDrop}
					zIndex={3}
				/>
			</>
		)
	}

	if (final) {
		return (<Box
			className='final-droppable'
			transition="background-color 0.2s ease"
			h={inDrag ? '32px' : '24px'}
			top={inDrag ? '-16px' : '-16px'}
			w="100%"
			position="absolute"
			backgroundColor={inDrag ? 'blue.300' : ''}
			onDragOver={onDragOver}
			onDragLeave={() => setInDrag(false)}
			onDrop={onDrop}
			zIndex={3}
		/>)
	}

	return (
		<Box
			transition="background-color 0.2s ease"
			h={inDrag ? '32px' : '8px'}
			top={inDrag ? '-16px' : '-8px'}
			w="100%"
			position="absolute"
			backgroundColor={inDrag ? 'blue.300' : ''}
			onDragOver={onDragOver}
			onDragLeave={() => setInDrag(false)}
			onDrop={onDrop}
			zIndex={3}
		/>
	)
}
export default Droppable
