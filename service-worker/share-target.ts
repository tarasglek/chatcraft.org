const handleShareTargetRequest = async () => {
  try {
    console.log("trying to fetch");
    const response = await fetch("/_web-share-target");
    const data = await response.text();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
};

// Call function when share target request triggered
handleShareTargetRequest();
