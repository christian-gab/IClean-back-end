import dotenv from 'dotenv'

dotenv.config({ path: '.env.development' })
process.env.NODE_ENV = 'test'
process.env.PERSISTENCE = 'memory'
