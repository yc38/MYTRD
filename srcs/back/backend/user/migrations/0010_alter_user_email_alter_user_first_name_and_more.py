# Generated by Django 5.1.1 on 2025-02-03 14:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0009_alter_user_email_alter_user_first_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.CharField(default='Undefined'),
        ),
        migrations.AlterField(
            model_name='user',
            name='first_name',
            field=models.CharField(default='Undefined'),
        ),
        migrations.AlterField(
            model_name='user',
            name='last_name',
            field=models.CharField(default='Undefined'),
        ),
    ]
