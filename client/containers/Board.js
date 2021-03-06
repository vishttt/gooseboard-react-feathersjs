import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
// Material-UI
import RaisedButton from 'material-ui/RaisedButton'
// Components
import Tile from '../components/Tile'
import Player from '../components/Player'
// Actions
import boardModel from '../models/board-model'
import setFormErrors from '../actions/set-form-errors'
import resetFormErrors from '../actions/reset-form-errors'

class Board extends React.Component {

  setFormErrors(errorMsg){
    this.props.setFormErrors(errorMsg)
  }

  startGame(){
    // Get props
    const { selectedBoard, boards, currentUser } = this.props
    const selectedBoardFromId = boards.find(function(b){
      return selectedBoard._id === b._id
    })
    const { winner, whoIsPlaying, tiles, players, owner } = selectedBoardFromId
    // Don't start if you're not the owner
    if(currentUser._id !== owner.userId){ return }
    // Send game started message
    this.props.setFormErrors({boardMsg: 'Game started!'})
    // Put all the players in the first tile and remove players from all other tiles
    const newTiles = tiles.map(function(tile){
      if(tile.cellNumber === 1){
        return {
          _id: tile._id,
          cellNumber: tile.cellNumber,
          image: tile.image,
          borderwidth: tile.borderwidth,
          borderradius: tile.borderradius,
          players: tile.players.concat(players)
        }
      }
      return {
        _id: tile._id,
        cellNumber: tile.cellNumber,
        image: tile.image,
        borderwidth: tile.borderwidth,
        borderradius: tile.borderradius,
        players: []
      }
    })
    // Set all players position to 1 and lastRoll to 0
    const newPlayers = players.map(function(p){
      return {
        _id: p._id,
        userId: p.userId,
        name: p.name,
        position: 1,
        lastRoll: 0
      }
    })
    // Set the STATE
    const payload = {
      winner: null,
      whoIsPlaying: newPlayers[0],
      tiles: newTiles,
      players: newPlayers
    }
    boardModel.save(selectedBoardFromId, payload)
  }

  playTurn(player){
    // Get props
    const { selectedBoard, boards, currentUser } = this.props
    const selectedBoardFromId = boards.find(function(b){
      return selectedBoard._id === b._id
    })
    const { winner, whoIsPlaying, tiles, players } = selectedBoardFromId
    const finishPosition = tiles.length
    // Check that the user is the player
    if(currentUser._id !== player.userId){ return }
    // Check that there is already a winner (game is closed)
    if (winner && winner.userId) {return }
    // Check that it's your turn
    if(whoIsPlaying && (player.userId !== whoIsPlaying.userId)){ return }
    // Roll the dice
    const diceResult = (1 + Math.floor(Math.random() * 6))

    // Get new player's position
    let resultPosition = player.position + diceResult // interim variable for checks
    let newPosition = player.position + diceResult
    // Set player played turn message
    this.props.setFormErrors({boardMsg: `${player.name} rolled ${diceResult} and went to tile ${resultPosition}`})
      // If POSITION 5: superman! fly 3 ahead
    if (resultPosition === 5 ){
      newPosition = 8
      this.props.setFormErrors({boardMsg: `${player.name} rolled ${diceResult} and went to tile ${resultPosition}. Superman just used his powers! Fly 3 steps ahead to ${newPosition}!`})
    }
      // If POSITION 13: banana! 3 steps back
    if (resultPosition === 13 ){
      newPosition = 10
      this.props.setFormErrors({boardMsg: `${player.name} rolled ${diceResult} and went to tile ${resultPosition}. Ouch! Who left that banana there?! Slip back 3 steps to ${newPosition}!`})
    }
      // If POSITION 27: party too much last night? need rest? go back to start!
    if (resultPosition === 27 ){
      newPosition = 1
      this.props.setFormErrors({boardMsg: `${player.name} rolled ${diceResult} and went to tile ${resultPosition}. Partied too much last night? need rest? go back to start!`})
    }
      // If POSITION 30: beyond finish, step back by the difference
    if (resultPosition > finishPosition ){
      let stepsBack = resultPosition - finishPosition
      newPosition = finishPosition - stepsBack
      this.props.setFormErrors({boardMsg: `${player.name} rolled ${diceResult} and went to tile ${resultPosition}. Oops, that's too far, you need to take ${stepsBack} steps back to ${newPosition}!`})
    }
    // Change STATE
      // Set new winner
    let newWinner = null
    if(newPosition === finishPosition){
      newWinner = player
    }
      // Change player position and lastRoll
    let newPlayers = players.map((p) => {
      if (p.userId === player.userId) {
        return {
          _id: p._id,
          userId: p.userId,
          name: p.name,
          position: newPosition,
          lastRoll: diceResult
        }
      }
      return p
    })
      // Change tile.players array
    let newTiles = tiles.map(function(tile){
        // Don't do anything if back to same position
      if(newPosition === player.position){
        return tile
      }
        // Remove player from existing tile
      if(tile.cellNumber === player.position){
        return {
          _id: tile._id,
          cellNumber: tile.cellNumber,
          image: tile.image,
          borderwidth: tile.borderwidth,
          borderradius: tile.borderradius,
          players: tile.players.filter(function(p){
            return p.userId !== player.userId
          })
        }
      }
        // Add player in target tile
      if(tile.cellNumber === newPosition){
        return {
          _id: tile._id,
          cellNumber: tile.cellNumber,
          image: tile.image,
          borderwidth: tile.borderwidth,
          borderradius: tile.borderradius,
          players: tile.players.concat([player])
        }
      }
      return tile
    })
      // Get next player
    const nextPlayerIndex = players.indexOf(player) + 1
    let nextPlayer = null
    if(nextPlayerIndex <= (players.length - 1)){
      nextPlayer = players.find(function(p, i){
        return i === nextPlayerIndex
      })
    } else {
      nextPlayer = players[0]
    }
    // Save all above states
    const payload = {
      winner: newWinner,
      whoIsPlaying: nextPlayer,
      tiles: newTiles,
      players: newPlayers
    }
    boardModel.save(selectedBoardFromId, payload)
  }

  renderTile(tile, index) {
    return (
      <Tile key={ index }
        tile = { tile }
        />
    );
  }

  renderPlayer(player, index) {
    const { selectedBoard, boards } = this.props
    const selectedBoardFromId = boards.find(function(b){
      return selectedBoard._id === b._id
    })
    const { winner, whoIsPlaying, tiles, players } = selectedBoardFromId
    const canPlay = (whoIsPlaying && (player.userId === whoIsPlaying.userId)) && !(winner && winner.userId)
    return (
      <Player key={ index }
      player={ player}
      canPlay={ canPlay }
      playTurn={ this.playTurn.bind(this) } />
    )
  }

  render() {
    const { selectedBoard, boards, formErrors } = this.props
    const selectedBoardFromId = boards.find(function(b){
      return selectedBoard._id === b._id
    })
    const { winner, whoIsPlaying, tiles, players } = selectedBoardFromId
    return (
      <div>
        <RaisedButton
        onClick={this.startGame.bind(this)}
        label="Start Game"
        backgroundColor="#f49905"
        />
        <div style={{display: 'flex'}}>
          <div>
          <br />
            <table style={{border: '1px solid black', backgroundColor: 'rgba(255, 252, 219, 0.8)', padding: '10px', minWidth: '200px' }}>
              <thead>
                <tr>
                  <th colSpan='2'>Player</th>
                </tr>
              </thead>
              <tbody>
                { players.map(this.renderPlayer.bind(this)) }
              </tbody>
            </table>
          </div>
          <div style={{margin: '20px'}}>
            { (winner && winner.userId) ?
              <h1 style={{color: 'green'}}>
                Winner: { winner.name } ! Let's party !!!
              </h1> : null
            }
            <h3 style={{color: 'red'}}>
              { formErrors.boardMsg }
            </h3>
          </div>
        </div>

        <br />
        <div>
          <div style={{minWidth: '1000px'}}>
            { tiles.slice(0,6).map(this.renderTile.bind(this)) }
          </div>
          <div style={{minWidth: '1000px'}}>
            { tiles.slice(6,12).map(this.renderTile.bind(this)) }
          </div>
          <div style={{minWidth: '1000px'}}>
            { tiles.slice(12,18).map(this.renderTile.bind(this)) }
          </div>
          <div style={{minWidth: '1000px'}}>
            { tiles.slice(18,24).map(this.renderTile.bind(this)) }
          </div>
          <div style={{minWidth: '1000px'}}>
            { tiles.slice(24,30).map(this.renderTile.bind(this)) }
          </div>
        </div>
      </div>
    )
  }

}

const mapStateToProps = (state) => {
  return {
    currentUser: state.currentUser,
    users: state.formErrors,
    boards: state.boards,
    selectedBoard: state.selectedBoard,
    formErrors: state.formErrors
  }
}

Board.propTypes = {

}

export default connect(mapStateToProps, { setFormErrors, resetFormErrors })(Board)
