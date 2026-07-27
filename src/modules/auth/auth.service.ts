import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { UsersService } from '../users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UsersService) {}

  async registerUser(dto: RegisterUserDto) {
    await this.userService.create(dto);
  }

  async loginUser(dto: LoginUserDto) {
    try {
      const user = await this.userService.findOneWithPasswordByEmail(dto.email);

      if (await bcrypt.compare(dto.password, user.password)) {
      }
    } catch (error) {}
  }
}
