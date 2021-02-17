import React, { useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import { Carousel } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [allPhotos, setAllPhotos] = useState([]);
  async function fetchPhotos() {
    const { data } = await axios.get(`${baseURI}getAllPhotos`);
    console.log(data);
    setAllPhotos(data);
  }
  const baseURI: String = process.env.REACT_APP_API_URL!;

  useEffect(() => {
    fetchPhotos();
  }, []);

  function getCarouselImage(photo: any) {
    return (
      <Carousel.Item interval={1000} style={{ height: 350 }}>
        <img src={photo.url} alt={photo.filename} />
        <Carousel.Caption>
          <h3>{photo.filename}</h3>
        </Carousel.Caption>
      </Carousel.Item>
    );
  }
  return (
    <div className="App">
      <Carousel>{allPhotos.map((photo) => getCarouselImage(photo))}</Carousel>
    </div>
  );
}

export default App;
