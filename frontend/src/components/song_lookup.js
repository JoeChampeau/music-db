import React from "react";
// We would like to use a modal (small window) to show details of a task.
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Label,
} from "reactstrap";

import axios from "axios"
import Song from "./Song"
import Login from "./Login"
import './s_lookup.css';
import { toHaveDisplayValue } from "@testing-library/jest-dom/dist/matchers";
import { unstable_renderSubtreeIntoContainer } from "react-dom";

export default class Song_lookup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      songList : [],
      ratingList: [],
      userList: [],
      currentSong: 0,
      currentUser: "",
      loginSupText: "",
      editSupText: "",
      active: 0,
      formText: {
        song: "",
        artist: "",
        rating: "",
        file: null
      }
    };
    this.changeEditMode = this.changeEditMode.bind(this)
    this.changeCurrentUser = this.changeCurrentUser.bind(this)
    this.deleteSong = this.deleteSong.bind(this)
  }

  

  componentDidMount() {
    this.refreshList();
  }

  loginBar() {
    return <Login username={this.state.currentUser} onChange={this.changeCurrentUser} supText={this.state.loginSupText}/>
  }
  changeEditMode(id) {
    if(this.state.currentUser === "") {
      this.setState({active: 0, editSupText: "Must be logged in!"})
      return
    }
    if(!(this.state.active == 1 && this.state.currentSong == id)) {
      let newRat = this.findUserRatingOfSong(this.state.currentUser, id).rating
      this.setState({currentSong: id, active: 1, editSupText: ""})
      this.setState({formText: {song: this.state.songList[id].song, artist: this.state.songList[id].artist, rating: newRat}})
    }
    else {
      this.setState({active: 0})
    }
  }

  async addOrUpdate(dest, exact, newData) {
    await axios
      .get(dest.concat(exact))
      .then((res) => {
        axios
          .patch(dest.concat(exact) + '/', newData)
          .then((res) => {
            this.refreshList()
            this.setState({active: 0})
          })
      })
      .catch((res) => {
        axios
          .post(dest, newData)
          .then((res) => {
            this.refreshList()
            this.setState({active: 0})
        })
      })
  }

  editSongRating = () => {
    if(this.state.formText.song === "" || this.state.formText.artist === "" || this.state.formText.rating === "" ) {
      this.setState({editSupText: "All fields must be filled in!"})
      return
    }
    if(this.state.formText.rating > 5 || this.state.formText.rating < 1) {
      this.setState({editSupText: "Rating must be within the range [1,5]"})
      return
    }
    this.setState({editSupText: ""})
    let dest = "http://localhost:8000/api/artists/"
    this.addOrUpdate(dest, this.state.currentSong, {song: this.state.formText.song, artist: this.state.formText.artist })
    dest = "http://localhost:8000/api/ratings/"
    this.addOrUpdate(dest, this.findUserRatingOfSong(this.state.currentUser, this.state.currentSong).id, {rating: this.state.formText.rating, song: this.state.currentSong, username: this.state.currentUser})
  }


  changeCurrentUser(username, password, signup) {
    this.setState({active: 0})
    let dest = "http://localhost:8000/api/users/"
    if (username === "") {
      this.setState({currentUser: "", loginSupText: ""})
      return
    }
    axios
      .get(dest.concat(username))
      .then((res) => {
        if(res.data.password === password) {
          this.setState({currentUser: username, loginSupText: ""})
        }
        else {
          this.setState({currentUser: "", loginSupText: (signup ? "Username already taken!" : "Invalid credentials")})
        }
      })
      .catch((res) => {
        if(signup) {
          axios
            .post("http://localhost:8000/api/users/", {username: username, password: password})
            .then((res) => {
              this.changeCurrentUser(username, password, false)
            })
        }
        else {
          this.setState({currentUser: "", loginSupText: "Invalid credentials"})
        }
      })
  }

  deleteSong(song) {
    let dest = "http://localhost:8000/api/artists/"
    dest = dest.concat(song)
    axios
      .delete(dest)
      .then((res) => {
        this.setState({active: 0})
        this.refreshList()
      })
  }

  addSongActivate = () => {
    if (this.state.currentUser === "") {
      this.setState({editSupText: "Must be logged in!"})
      return
    }
    if ((this.state.active==2)) {
      this.setState({active: 0})
    }
    else {
      this.setState({active: 2})
    }
    this.setState({formText: {song: "", artist: "", rating: ""}, editSupText: ""})
  }

  checkDupSongs(name, artistName, f) {
    if (name === "" || artistName === "" || f === undefined) {
      return true
    }
    for (const[key, value] of Object.entries(this.state.songList)) {
      if (value.song === name && value.artist == artistName) {
        return true
      }
    }
    return false
  }

  

  addSong = () => {
    if (this.checkDupSongs(this.state.formText.song, this.state.formText.artist, this.state.formText.file)) {
      this.setState({editSupText: "Invalid submission or song already exists!"})
      return
    }
    let dest = "http://localhost:8000/api/artists/"
    this.setState({editSupText: ""})

    let form_data = new FormData();
    form_data.append('file', this.state.formText.file, this.state.formText.file.name);
    form_data.append('song', this.state.formText.song);
    form_data.append('artist', this.state.formText.artist);

    axios
      .post(dest, form_data, {headers: {
        'content-type': 'multipart/form-data'
      }})
      .then((res) => {
        this.refreshList()
        this.setState({active: 0})
      })
      .catch((res) => {
        console.log(res.toJSON())
      })
     
  }

  renderSongs() {
    return Object.entries(this.state.songList).map(([key, value]) =>
      <Song id={key} song={value.song} file={value.file} artist={value.artist} average={value.av} count={value.count} onChange={this.changeEditMode} deleteSong={this.deleteSong}/>
    )
  }

  findUserRatingOfSong(user, songid) {
    let returnRat = {id: 0, rating: 0}
    this.state.ratingList.map((rating) => {
      if (user == rating.username && songid == rating.song) {
        returnRat = rating
      }
    })
    return returnRat
  }

  handleChange = (event) => {
    let {name, value} = event.target
    let newForm = this.state.formText
    newForm[name] = value
    this.setState({
        formText: newForm
    });
  }

  handleFileChange = (event) => {
    let newForm = this.state.formText
    newForm.file = event.target.files[0]
    this.setState({
        formText: newForm
    });
  };

  calculateAverageRating = (u) => {
    let average = 0
    let count = 0
    this.state.ratingList.map((rating) =>{
      if (u == rating.song) {
        count++
        average += rating.rating
      }
    })
    if (count == 0) {
      return [0,0]
    }
    return [Number.parseFloat(average/count).toFixed(2), count]
  }

  populateSongs = (artists) => {
      axios
      .get("http://localhost:8000/api/ratings/")
      .then((res) => {
        this.setState({ ratingList: res.data})
        let newlist = []
        for (const[key, value] of Object.entries(artists)) {
            let figures = this.calculateAverageRating(key)
            newlist[key] = {song: value.song, artist: value.artist, av: figures[0], count: figures[1], file: value.file}
        }

        this.setState({ songList: newlist })
        console.log(this.state.songList)
      })
      .catch((err) => console.log(err));
  }

  refreshList = () => {
    // We are using the axios library for making HTTP requests.
    // Here is a GET request to our api/todos path.
    // If it succeeds, we set the todoList to the resolved data.
    // Otherwise, we catch the error and print it to the console (rejected data).
    // We are using async calls here. Please refer to the JavaScript
    // tutorial for how they work.
    axios
      .get("http://localhost:8000/api/artists/")
      .then((res) => {
        let artistList = []
        res.data.map((songItem) => artistList[songItem.id] = {song: songItem.song, artist: songItem.artist, file: songItem.file})
        this.populateSongs(artistList)
      })
  };

  editBar() {
    let editHtml = ""
    if (this.state.active == 1){
      editHtml = (
        <div className="editBar">
          <b>Edit Song/Rating </b>
        <Form>
            <FormGroup>
              <Label for="song">Title </Label>
              <Input
                type="text"
                name="song"
                value={this.state.formText.song}
                onChange={this.handleChange}
                placeholder="Change Song Name"
              />
            </FormGroup>
            <FormGroup>
              <Label for="artist">Artist </Label>
              <Input
                type="text"
                name="artist"
                value={this.state.formText.artist}
                onChange={this.handleChange}
                placeholder="Change Artist"
              />
            </FormGroup>
            <FormGroup>
              <Label for="rating">Rating </Label>
                <Input
                  type="number"
                  name="rating"
                  value={this.state.formText.rating}
                  onChange={this.handleChange}
                  placeholder="Change Rating"
                />
            </FormGroup>
            


          </Form>
          <Button onClick={this.editSongRating} style={{marginRight: "1vw"}}>
              Submit
          </Button>
          </div>
      );
    }
    else if (this.state.active == 2) {
      editHtml = (
        <div className="editBar">
          <b>Add Song </b>
        <Form>
            <FormGroup>
              <Label for="song">Title </Label>
              <Input
                type="text"
                name="song"
                value={this.state.formText.song}
                onChange={this.handleChange}
                placeholder=""
              />
            </FormGroup>
            <FormGroup>
              <Label for="artist">Artist </Label>
              <Input
                type="text"
                name="artist"
                value={this.state.formText.artist}
                onChange={this.handleChange}
                placeholder=""
              />
            </FormGroup>

            <FormGroup>
              <Label for="file">MP3 File </Label>
              <Input
                type="file"
                name="file"
                onChange={this.handleFileChange}
                placeholder=""
              />
            </FormGroup>
          </Form>
          <Button onClick={this.addSong}>
              Submit
          </Button>
          </div>
      );
    }
    return editHtml
  }

  render() {
    return(
    <div style={{margin: 50}}>
      <div className="login">
        {this.loginBar()}
      </div>
      <h1 style={{marginBottom:"80px"}}>Rate A Song!</h1>
      <div style={{margin: 10, textAlign: "left"}}>
        <h2 style={{marginLeft: "100px"}}>Songs</h2>
        <div className="flex-container">
          <div>
            <ul className="list">
              {this.renderSongs()}
            </ul>
          </div>
          <div style={{backgroundColor: "whitesmoke"}}></div>
        </div>
        <div className="editBar">
            {this.editBar()}
            <br></br>
        </div>
        <div style={{margin: "10px", marginLeft: "20%"}}>
              <Button onClick={this.addSongActivate}>
                Add Song
              </Button>
        </div>
      </div>
      <div style={{color: "red"}}>{this.state.editSupText}</div>
    </div>
    );}

    
}