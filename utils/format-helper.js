export const formatNumberBr = number => {
    return number?.toLocaleString("pt-br", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}