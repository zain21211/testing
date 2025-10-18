import React from 'react'
import Card from '../Card';
import { Box } from "@mui/material";

const LoadingCard = ({ list, status, loading }) => {
    return (
        <div>
            {/* not found */}
            {list.length === 0 && !loading && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "69vh",
                    }}
                >
                    <Card text={"no customer found"} code={404} color="grey" />
                </Box>
            )}

            {/* while list loading */}
            {loading && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "69vh",
                    }}
                >
                    <Card
                        text={"your content is loading ..."}
                        code={"Loading"}
                        color="darkblue"
                    />
                </Box>
            )}

            {/* while list loading */}
            {status && !(list.length === 0 || loading) && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        // height: '69vh'
                    }}
                >
                    <Card text={"posted"} code={status} color={status === 200 ? "green" : "red"} />
                </Box>
            )}

        </div>
    )
}

export default LoadingCard
