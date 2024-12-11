import { Box, Text, Input, type TextProps, type InputProps, type BoxProps } from '@chakra-ui/react'
import { useState } from 'react'
interface IProps extends BoxProps {
    defaultValue: string
    onBlur: (e: React.FocusEvent<HTMLInputElement, Element>) => void
    textProps?: TextProps
    inputProps?: InputProps
}
const EditableText = ({defaultValue, onBlur, textProps, inputProps, ...boxProps }: IProps) => {
    const [focusMode, setFocusMode] = useState(false)
    const [text, setText] = useState(defaultValue)
	return <Box {...boxProps}>
        {focusMode ? <Input value={text} autoFocus onFocus={(e) => e.target.select()} onBlur={(e) => {
            setFocusMode(false)
            onBlur(e)
        }} onChange={(e) => setText(e.target.value)} {...inputProps} /> : <Text onClick={() => setFocusMode(true)} {...textProps}>{text}</Text>}
    </Box>
}

export default EditableText
