import { Typography, Skeleton, Grid, TextField } from "@mui/material";

const CustomerDetails = ({ customer }) => {
  return (
    <Grid
      container
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 0 }}
    >
      <Grid item sx={{ width: "25%" }}>
        <Typography variant="h6" color="text.secondary">
          ESTIMATE #
        </Typography>
        <Typography variant="h4" fontWeight="bold" color="primary">
          {customer?.InvoiceNumber}
          {!customer?.InvoiceNumber && <Skeleton height={30} width="90%" />}
        </Typography>
      </Grid>
      <Box>
        <Typography
          variant="h5"
          alignSelf="center"
          sx={{
            fontWeight: "bold",
            fontSize: { xs: "3rem", sm: "4rem" },
            textAlign: "center",
            margin: "auto",
            fontFamily: "Jameel Noori Nastaleeq, serif !important",
          }}
        >
          {customer?.CustomerName}
          {!customer?.CustomerName && <Skeleton height={30} width="90%" />}
        </Typography>
      </Box>
      <Grid item xs={12} sx={{ width: { xs: "23%" } }}>
        <TextField
          size="small"
          label="Date"
          InputLabelProps={{
            shrink: true,
            sx: {
              backgroundColor: "white",
            },
          }}
          value={
            customer?.InvoiceDate
              ? new Date(customer.InvoiceDate)
                  .toLocaleDateString("en-GB")
                  .replace(/\//g, "-")
              : ""
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              border: "1px solid black",
              borderRadius: "1rem",
              fontSize: "1rem",
              fontWeight: "bold",
              textAlign: "center",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
            outline: "none",
          }}
        />
      </Grid>
    </Grid>
  );
};

export default CustomerDetails;
