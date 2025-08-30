import { TextField, MenuItem } from '@mui/material';

const PackingNotes = ({
    nug,
    person,
    onNugChange,
    onPersonChange,
    nugRef,
    packedByRef
}) => {
    return (
        <>
            <TextField
                label="NUG"
                variant="outlined"
                inputRef={nugRef}
                InputLabelProps={{ shrink: true }}
                inputProps={{ inputMode: "numeric" }}
                sx={{ m: 3, width: "100px" }}
                value={nug}
                onChange={(e) => onNugChange(e.target.value)}
            />
            <TextField
                label="PACKED BY"
                variant="outlined"
                inputRef={packedByRef}
                select
                InputLabelProps={{ shrink: true }}
                value={person}
                onChange={(e) => onPersonChange(e.target.value)}
                sx={{
                    my: 3,
                    width: "200px",
                    direction: "rtl",
                    "& .MuiSelect-select": {
                        textAlign: "right",
                        direction: "rtl",
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: "black",
                    },
                }}
                SelectProps={{
                    MenuProps: {
                        PaperProps: {
                            sx: {
                                direction: "rtl",
                                "& .MuiMenuItem-root": {
                                    justifyContent: "flex-end",
                                    textAlign: "right",
                                },
                            },
                        },
                    },
                }}
            >
                {persons.map((name, index) => (
                    <MenuItem
                        key={index}
                        value={name}
                        sx={{
                            fontFamily: "Jameel Noori Nastaleeq, serif",
                            fontSize: "1.5rem",
                            color: "black",
                            fontWeight: "bold",
                            borderBottom: "1px solid #ddd",
                            padding: "8px 16px",
                            textAlign: "right",
                            width: "100%",
                            display: "flex",
                            justifyContent: "flex-end",
                            direction: "rtl",
                        }}
                    >
                        {name}
                    </MenuItem>
                ))}
            </TextField>
        </>
    );
};

export default PackingNotes;
