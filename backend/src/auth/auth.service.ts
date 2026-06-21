import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}
  
  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.usersService.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Hashing password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user in db
    const newUser = await this.usersService.createUser({
      email,
      passwordHash: hashedPassword,
    });

    return {
      id: newUser.id,
      email: newUser.email,
    };
  }
  
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findUserByEmail(email);
    
    if (user) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        return {
          id: user.id,
          email: user.email,
        };
      }
    }
    
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    // Sign the payload using secret key and return
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
