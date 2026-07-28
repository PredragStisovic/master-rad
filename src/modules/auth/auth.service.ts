import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { UsersService } from '../users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registerUser(dto: RegisterUserDto) {
    await this.userService.create(dto);
  }

  async loginUser(user: UserEntity) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(dto: LoginUserDto) {
    const user = await this.userService.findOneWithPasswordByEmail(dto.email);

    if (await bcrypt.compare(dto.password, user.password)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }
}
