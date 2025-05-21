
async function sleepForDenoise() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
}

export default sleepForDenoise;