import mongoose from 'mongoose'

const Schema = mongoose.Schema;

const guideSchema = new Schema({
    tittel: String,
    tag: String,
    overskrift: Array,
    beskrivelse: Array,
    imgFile: Array
})

export default mongoose.model('newGuide', userSchema);