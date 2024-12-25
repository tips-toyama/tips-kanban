import type { IUser } from '@/types'
import { DeleteIcon } from '@chakra-ui/icons'
import { Avatar, Tooltip } from '@chakra-ui/react'
import BoringAvatar from 'boring-avatars'
import { useState } from 'react'
interface IProps {
    user: string
    userMap: IUser[]
    size: string
    deleteMode?: boolean
    onClick?: (id: string) => void
}
const UserIcon = ({ user, userMap, size, deleteMode: defaultDeleteMode, onClick }: IProps) => {
    const userObj = userMap.find((u) => u.id === user)
    const [deleteMode, setDeleteMode] = useState(false)

    return (
        <Avatar
            onMouseOver={() => setDeleteMode(defaultDeleteMode || false)}
            onMouseLeave={() => setDeleteMode(false)}
            onClick={() => (deleteMode && typeof onClick === 'function') ? onClick(user) : null}
            size={size || 'xm'}
            icon={deleteMode ? <DeleteIcon cursor="pointer" />: <Tooltip label={userObj?.name}>
                <BoringAvatar name={userObj?.name} variant="beam" />
            </Tooltip>}
        />
    )
}
export default UserIcon
