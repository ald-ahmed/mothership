const request = require('supertest')
const app = require('../app')

describe('Add/Update/Delete Endpoints Testing', () => {

  it('creates a new robot config', async (done) => {
    const res = await request(app)
      .post('/robots/configs')
      .send({
        name: 'test subject 1',
        color: 'green',
        locationX: 0,
        locationY: 0
      })
    expect(res.statusCode).toEqual(200)
    expect(res.body._id).toBeDefined()
    console.log(res.body);
    done();
  })

  it('checks record is in database', async done => {
    const response  = await request(app)
      .get('/robots/configs')

    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThanOrEqual(1)
    console.log("number of docs", response.body.length);

    done()
  })

  it('modifies a record', async done => {

    const response  = await request(app)
      .get('/robots/configs')

    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThanOrEqual(1)

    const config_id = response.body[0]._id
    const name = response.body[0].name
    const color = response.body[0].color
    const locationX = response.body[0].locationX
    const locationY = response.body[0].locationY

    const response2  = await request(app)
      .put('/robots/configs/'+config_id)
      .send({
        name: name,
        color: color,
        locationX: locationX+10,
        locationY: locationY-10
      })

    expect(response2.status).toBe(200)
    expect(response2.body._id).toEqual(config_id)
    expect(response2.body.name).toEqual(name)
    expect(response2.body.color).toEqual(color)
    expect(response2.body.locationX).toEqual(locationX+10)
    expect(response2.body.locationY).toEqual(locationY-10)

    done()
  })

  it('deletes a record that does not exist', async done => {

    const response2  = await request(app)
      .delete('/robots/configs/'+'000000000000000000000000')

    expect(response2.status).toBeGreaterThanOrEqual(400)

    done()
  })

  it('deletes a record that does exist', async done => {

    const response  = await request(app)
      .get('/robots/configs')

    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThanOrEqual(1)

    const config_id = response.body[0]._id
    const name = response.body[0].name
    const color = response.body[0].color
    const locationX = response.body[0].locationX
    const locationY = response.body[0].locationY

    const response2  = await request(app)
      .delete('/robots/configs/'+config_id)

    expect(response2.status).toBe(200)
    expect(response2.body._id).toBe(config_id)
    expect(response2.body.name).toBe(name)
    expect(response2.body.color).toBe(color)
    expect(response2.body.locationX).toBe(locationX)
    expect(response2.body.locationY).toBe(locationY)

    done()
  })


})


